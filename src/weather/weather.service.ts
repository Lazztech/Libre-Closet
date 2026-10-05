import {
  Inject,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CACHE_MANAGER, Cache } from '@nestjs/cache-manager';
import {
  NominatimReverseResponse,
  OpenMeteoDayResponse,
  OpenMeteoResponse,
  WeatherDayForecast,
  WeatherForecastDay,
} from './dto/weather-forecast.dto';
import { TemperatureUnit } from './temperature-unit.util';
import { weatherCodeToDescription } from './weathercode.util';

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';
const NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org/reverse';

/** Fallback forecast TTL when WEATHER_CACHE_TTL_MS is not configured. */
const DEFAULT_FORECAST_TTL_MS = 30 * 60 * 1000;
/** Location labels are effectively immutable; cache them for a full day. */
const LOCATION_TTL_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);
  private readonly forecastTtlMs: number;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
    configService: ConfigService,
  ) {
    this.forecastTtlMs =
      configService.get<number>('WEATHER_CACHE_TTL_MS') ??
      DEFAULT_FORECAST_TTL_MS;
  }

  async getForecast(
    lat: number,
    lon: number,
    unit: TemperatureUnit = 'celsius',
  ): Promise<WeatherForecastDay[]> {
    const cacheKey = `weather:forecast:${lat.toFixed(3)}:${lon.toFixed(3)}:${unit}`;
    const cached = await this.cacheManager.get<WeatherForecastDay[]>(cacheKey);
    if (cached) return cached;

    const url = this.openMeteoUrl(
      lat,
      lon,
      unit,
      'weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    );
    const data = await this.fetchOpenMeteo<OpenMeteoResponse>(url);

    const forecast = data.daily.time.map((date, i) => ({
      date,
      weathercode: data.daily.weathercode[i],
      temperatureMax: data.daily.temperature_2m_max[i],
      temperatureMin: data.daily.temperature_2m_min[i],
      precipitationProbabilityMax: data.daily.precipitation_probability_max[i],
    }));
    await this.cacheManager.set(cacheKey, forecast, this.forecastTtlMs);
    return forecast;
  }

  /**
   * Detailed forecast for a single day: daily summary plus a 3-hour-step
   * hourly strip. Returns null when the date is outside the forecast window.
   */
  async getDayForecast(
    lat: number,
    lon: number,
    date: string,
    unit: TemperatureUnit = 'celsius',
  ): Promise<WeatherDayForecast | null> {
    const cacheKey = `weather:day:${lat.toFixed(3)}:${lon.toFixed(3)}:${date}:${unit}`;
    const cached = await this.cacheManager.get<WeatherDayForecast>(cacheKey);
    if (cached) return cached;

    const url = this.openMeteoUrl(
      lat,
      lon,
      unit,
      'weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
      'weathercode,temperature_2m',
    );
    const data = await this.fetchOpenMeteo<OpenMeteoDayResponse>(url);

    const dayIndex = data.daily.time.indexOf(date);
    if (dayIndex === -1) return null;

    const hours = data.hourly.time
      .map((time, i) => ({ time, i }))
      .filter(({ time }) => time.startsWith(`${date}T`))
      .filter(({ time }) => Number(time.slice(11, 13)) % 3 === 0)
      .map(({ time, i }) => ({
        hour: time.slice(11, 16),
        emoji: weatherCodeToDescription(data.hourly.weathercode[i]).emoji,
        temperature: Math.round(data.hourly.temperature_2m[i]),
      }));

    const dayForecast: WeatherDayForecast = {
      date,
      weathercode: data.daily.weathercode[dayIndex],
      temperatureMax: data.daily.temperature_2m_max[dayIndex],
      temperatureMin: data.daily.temperature_2m_min[dayIndex],
      precipitationProbabilityMax:
        data.daily.precipitation_probability_max[dayIndex] ?? 0,
      hours,
    };
    await this.cacheManager.set(cacheKey, dayForecast, this.forecastTtlMs);
    return dayForecast;
  }

  /**
   * Human-readable area/region label for coordinates via OSM Nominatim
   * reverse geocoding (e.g. "Brooklyn, New York"). Results are cached
   * in-memory per rounded coordinate + language; failures resolve to null so
   * callers can render without the label.
   */
  async getLocationLabel(
    lat: number,
    lon: number,
    language?: string,
  ): Promise<string | null> {
    const cacheKey = `weather:location:${lat.toFixed(2)}:${lon.toFixed(2)}:${language ?? ''}`;
    const cached = await this.cacheManager.get<{ label: string | null }>(
      cacheKey,
    );
    if (cached) return cached.label;

    const url = new URL(NOMINATIM_BASE_URL);
    url.searchParams.set('lat', String(lat));
    url.searchParams.set('lon', String(lon));
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('zoom', '10');

    let label: string | null = null;
    try {
      const response = await fetch(url.toString(), {
        headers: {
          'User-Agent': 'LibreCloset',
          'Accept-Language': language || 'en',
        },
        signal: AbortSignal.timeout(5000),
      });
      if (response.ok) {
        const data = (await response.json()) as NominatimReverseResponse;
        label = this.labelFromNominatim(data);
      }
    } catch (err) {
      this.logger.warn('Reverse geocoding unavailable', err);
    }

    // Wrapper object distinguishes cached "not found" (null label) from a
    // cache miss, which get() reports as undefined/null.
    await this.cacheManager.set(cacheKey, { label }, LOCATION_TTL_MS);
    return label;
  }

  /** Builds a "locality, region" label from a Nominatim reverse-geocode
   * response, collapsing the two when they're identical (e.g. New York). */
  private labelFromNominatim(data: NominatimReverseResponse): string | null {
    const a = data.address ?? {};
    const locality =
      a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? data.name;
    const region = a.state ?? a.country;
    return this.joinLocalityRegion(locality, region);
  }

  /** Joins locality and region, collapsing identical values (e.g. New York). */
  private joinLocalityRegion(
    locality?: string,
    region?: string,
  ): string | null {
    if (locality && region && locality.toLowerCase() === region.toLowerCase()) {
      return locality;
    }
    return [locality, region].filter(Boolean).join(', ') || null;
  }

  private openMeteoUrl(
    lat: number,
    lon: number,
    unit: TemperatureUnit,
    daily: string,
    hourly?: string,
  ): URL {
    const url = new URL(OPEN_METEO_BASE_URL);
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set('daily', daily);
    if (hourly) url.searchParams.set('hourly', hourly);
    url.searchParams.set('temperature_unit', unit);
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '14');
    return url;
  }

  private async fetchOpenMeteo<T>(url: URL): Promise<T> {
    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Open-Meteo responded with status ${response.status}`);
      }
      return (await response.json()) as T;
    } catch (err) {
      this.logger.error('Failed to fetch weather forecast', err);
      throw new ServiceUnavailableException('Weather forecast is unavailable');
    }
  }
}

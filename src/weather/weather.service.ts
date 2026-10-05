import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
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

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  /** Reverse-geocode labels keyed by rounded coords + language. */
  private readonly locationCache = new Map<string, string | null>();

  async getForecast(
    lat: number,
    lon: number,
    unit: TemperatureUnit = 'celsius',
  ): Promise<WeatherForecastDay[]> {
    const url = this.openMeteoUrl(
      lat,
      lon,
      unit,
      'weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    );
    const data = await this.fetchOpenMeteo<OpenMeteoResponse>(url);

    return data.daily.time.map((date, i) => ({
      date,
      weathercode: data.daily.weathercode[i],
      temperatureMax: data.daily.temperature_2m_max[i],
      temperatureMin: data.daily.temperature_2m_min[i],
      precipitationProbabilityMax: data.daily.precipitation_probability_max[i],
    }));
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

    return {
      date,
      weathercode: data.daily.weathercode[dayIndex],
      temperatureMax: data.daily.temperature_2m_max[dayIndex],
      temperatureMin: data.daily.temperature_2m_min[dayIndex],
      precipitationProbabilityMax:
        data.daily.precipitation_probability_max[dayIndex] ?? 0,
      hours,
    };
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
    const cacheKey = `${lat.toFixed(2)}|${lon.toFixed(2)}|${language ?? ''}`;
    if (this.locationCache.has(cacheKey)) {
      return this.locationCache.get(cacheKey) ?? null;
    }

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
        const a = data.address ?? {};
        const locality =
          a.city ??
          a.town ??
          a.village ??
          a.municipality ??
          a.county ??
          data.name;
        const region = a.state ?? a.country;
        label =
          locality && region && locality.toLowerCase() === region.toLowerCase()
            ? locality
            : [locality, region].filter(Boolean).join(', ') || null;
      }
    } catch (err) {
      this.logger.warn('Reverse geocoding unavailable', err);
    }

    this.locationCache.set(cacheKey, label);
    return label;
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

import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  OpenMeteoResponse,
  WeatherForecastDay,
} from './dto/weather-forecast.dto';

const OPEN_METEO_BASE_URL = 'https://api.open-meteo.com/v1/forecast';

@Injectable()
export class WeatherService {
  private readonly logger = new Logger(WeatherService.name);

  async getForecast(lat: number, lon: number): Promise<WeatherForecastDay[]> {
    const url = new URL(OPEN_METEO_BASE_URL);
    url.searchParams.set('latitude', String(lat));
    url.searchParams.set('longitude', String(lon));
    url.searchParams.set(
      'daily',
      'weathercode,temperature_2m_max,temperature_2m_min,precipitation_probability_max',
    );
    url.searchParams.set('timezone', 'auto');
    url.searchParams.set('forecast_days', '14');

    let data: OpenMeteoResponse;
    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        throw new Error(`Open-Meteo responded with status ${response.status}`);
      }
      data = (await response.json()) as OpenMeteoResponse;
    } catch (err) {
      this.logger.error('Failed to fetch weather forecast', err);
      throw new ServiceUnavailableException('Weather forecast is unavailable');
    }

    return data.daily.time.map((date, i) => ({
      date,
      weathercode: data.daily.weathercode[i],
      temperatureMax: data.daily.temperature_2m_max[i],
      temperatureMin: data.daily.temperature_2m_min[i],
      precipitationProbabilityMax: data.daily.precipitation_probability_max[i],
    }));
  }
}

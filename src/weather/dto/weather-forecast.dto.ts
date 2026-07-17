/** Raw daily parallel-array response from the Open-Meteo /v1/forecast endpoint */
export interface OpenMeteoResponse {
  daily: {
    time: string[];
    weathercode: number[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    precipitation_probability_max: number[];
  };
}

/** A single day of forecast data, zipped from the Open-Meteo parallel arrays */
export class WeatherForecastDay {
  date: string;
  weathercode: number;
  temperatureMax: number;
  temperatureMin: number;
  precipitationProbabilityMax: number;
}

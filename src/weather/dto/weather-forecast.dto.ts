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

/** Raw daily + hourly parallel-array response for single-day details */
export interface OpenMeteoDayResponse {
  daily: OpenMeteoResponse['daily'];
  hourly: {
    time: string[];
    weathercode: number[];
    temperature_2m: number[];
  };
}

/** A single day of forecast data, zipped from the Open-Meteo parallel arrays.
 * Temperatures are in the unit requested by the caller (see WeatherService). */
export interface WeatherForecastDay {
  date: string;
  weathercode: number;
  temperatureMax: number;
  temperatureMin: number;
  precipitationProbabilityMax: number;
}

/** A 3-hour-step sample within a single forecast day. */
export interface WeatherHour {
  /** Local time as HH:MM */
  hour: string;
  emoji: string;
  temperature: number;
}

/** Detailed forecast for a single calendar day. */
export interface WeatherDayForecast {
  date: string;
  weathercode: number;
  temperatureMax: number;
  temperatureMin: number;
  precipitationProbabilityMax: number;
  hours: WeatherHour[];
}

/** Partial reverse-geocode response from OSM Nominatim (format=jsonv2) */
export interface NominatimReverseResponse {
  name?: string;
  address?: {
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    country?: string;
  };
}

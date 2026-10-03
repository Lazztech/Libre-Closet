/** WMO weather interpretation code ranges mapped to display values.
 * `labelKey` is the bare lang.json key for the condition description. */
const WMO_RANGES: [
  min: number,
  max: number,
  emoji: string,
  labelKey: string,
][] = [
  [0, 1, '☀️', 'WEATHER_CLEAR_SKY'],
  [2, 3, '⛅', 'WEATHER_CLOUDY'],
  [45, 48, '⛅', 'WEATHER_CLOUDY'],
  [51, 67, '🌧️', 'WEATHER_RAIN'],
  [71, 77, '❄️', 'WEATHER_SNOW'],
  [80, 82, '🌧️', 'WEATHER_RAIN'],
  [85, 86, '❄️', 'WEATHER_SNOW'],
  [95, 99, '⛈️', 'WEATHER_THUNDERSTORM'],
];

export function weatherCodeToDescription(code: number): {
  emoji: string;
  labelKey: string;
} {
  for (const [min, max, emoji, labelKey] of WMO_RANGES) {
    if (code >= min && code <= max) return { emoji, labelKey };
  }
  return { emoji: '', labelKey: 'WEATHER_UNKNOWN' };
}

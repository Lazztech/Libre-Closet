/** WMO weather interpretation code ranges mapped to display values. */
const WMO_RANGES: [min: number, max: number, emoji: string, label: string][] = [
  [0, 1, '☀️', 'Clear sky'],
  [2, 3, '⛅', 'Cloudy'],
  [45, 48, '⛅', 'Cloudy'],
  [51, 67, '🌧️', 'Rain'],
  [71, 77, '❄️', 'Snow'],
  [80, 82, '🌧️', 'Rain'],
  [85, 86, '❄️', 'Snow'],
  [95, 99, '⛈️', 'Thunderstorm'],
];

export function weatherCodeToDescription(code: number): {
  emoji: string;
  label: string;
} {
  for (const [min, max, emoji, label] of WMO_RANGES) {
    if (code >= min && code <= max) return { emoji, label };
  }
  return { emoji: '', label: 'Unknown' };
}

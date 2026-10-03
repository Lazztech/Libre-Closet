export type TemperatureUnit = 'celsius' | 'fahrenheit';

/**
 * Regions whose customary temperature scale is Fahrenheit. The list is
 * intentionally minimal (US is the dominant case); add more region subtags
 * here rather than special-casing callers.
 */
const FAHRENHEIT_REGIONS = new Set(['US']);

/**
 * Derives the preferred temperature unit from an Accept-Language header.
 *
 * Language tags are evaluated in priority order as given; the first tag that
 * carries a region subtag decides the outcome (region `US` → Fahrenheit,
 * anything else → Celsius). Tags without a region are skipped so that e.g.
 * "en-GB,en-US;q=0.9" still resolves to Fahrenheit. Absent or malformed
 * headers fall back to Celsius.
 */
export function temperatureUnitFromAcceptLanguage(
  acceptLanguage: string | undefined,
): TemperatureUnit {
  if (!acceptLanguage) return 'celsius';
  for (const part of acceptLanguage.split(',')) {
    const tag = part.split(';')[0]?.trim();
    if (!tag || tag === '*') continue;
    const region = tag.split('-')[1];
    if (region && FAHRENHEIT_REGIONS.has(region.toUpperCase())) {
      return 'fahrenheit';
    }
    if (region) return 'celsius';
  }
  return 'celsius';
}

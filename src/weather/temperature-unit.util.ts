export type TemperatureUnit = 'celsius' | 'fahrenheit';

/**
 * Regions whose customary temperature scale is Fahrenheit. The list is
 * intentionally minimal (US is the dominant case); add more region subtags
 * here rather than special-casing callers.
 */
const FAHRENHEIT_REGIONS = new Set(['US']);

/**
 * Returns the region subtag of the first language tag that carries one, or
 * undefined when no tag has a region. Tags are evaluated in priority order
 * as given in the header.
 */
function firstRegionSubtag(
  acceptLanguage: string | undefined,
): string | undefined {
  if (!acceptLanguage) return undefined;
  for (const part of acceptLanguage.split(',')) {
    const tag = part.split(';')[0]?.trim();
    if (!tag || tag === '*') continue;
    const region = tag.split('-')[1];
    if (region) return region.toUpperCase();
  }
  return undefined;
}

/**
 * Derives the preferred temperature unit from an Accept-Language header.
 *
 * The first tag that carries a region subtag decides the outcome (region
 * `US` → Fahrenheit, anything else → Celsius). Tags without a region are
 * skipped so that e.g. "en-GB,en-US;q=0.9" still resolves to Fahrenheit.
 * Absent or malformed headers fall back to Celsius.
 */
export function temperatureUnitFromAcceptLanguage(
  acceptLanguage: string | undefined,
): TemperatureUnit {
  const region = firstRegionSubtag(acceptLanguage);
  return region != null && FAHRENHEIT_REGIONS.has(region)
    ? 'fahrenheit'
    : 'celsius';
}

/**
 * Whether the locale conventionally uses a 12-hour AM/PM clock. Mirrors the
 * Fahrenheit region set (US-style locales); other locales keep the 24-hour
 * clock.
 */
export function usesTwelveHourClock(
  acceptLanguage: string | undefined,
): boolean {
  const region = firstRegionSubtag(acceptLanguage);
  return region != null && FAHRENHEIT_REGIONS.has(region);
}

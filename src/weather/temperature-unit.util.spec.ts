import {
  temperatureUnitFromAcceptLanguage,
  usesTwelveHourClock,
} from './temperature-unit.util';

describe('temperatureUnitFromAcceptLanguage', () => {
  it('resolves en-US to fahrenheit', () => {
    expect(temperatureUnitFromAcceptLanguage('en-US')).toBe('fahrenheit');
  });

  it('resolves en-US with q-params to fahrenheit', () => {
    expect(temperatureUnitFromAcceptLanguage('en-US,en;q=0.9,de;q=0.8')).toBe(
      'fahrenheit',
    );
  });

  it('is case-insensitive on region and language', () => {
    expect(temperatureUnitFromAcceptLanguage('EN-us')).toBe('fahrenheit');
  });

  it('skips region-less tags and follows later tags', () => {
    expect(temperatureUnitFromAcceptLanguage('en,de-DE')).toBe('celsius');
    expect(temperatureUnitFromAcceptLanguage('en,en-US;q=0.5')).toBe(
      'fahrenheit',
    );
  });

  it('lets the first region-bearing tag decide', () => {
    expect(temperatureUnitFromAcceptLanguage('en,de-DE,en-US;q=0.5')).toBe(
      'celsius',
    );
  });

  it('resolves en-GB to celsius', () => {
    expect(temperatureUnitFromAcceptLanguage('en-GB,en;q=0.9')).toBe('celsius');
  });

  it('resolves non-English locales to celsius', () => {
    expect(temperatureUnitFromAcceptLanguage('de-DE')).toBe('celsius');
    expect(temperatureUnitFromAcceptLanguage('da-DK,da;q=0.9')).toBe('celsius');
  });

  it('falls back to celsius for region-less-only headers', () => {
    expect(temperatureUnitFromAcceptLanguage('en')).toBe('celsius');
    expect(temperatureUnitFromAcceptLanguage('en;q=0.9')).toBe('celsius');
  });

  it('falls back to celsius for missing, empty, or wildcard headers', () => {
    expect(temperatureUnitFromAcceptLanguage(undefined)).toBe('celsius');
    expect(temperatureUnitFromAcceptLanguage('')).toBe('celsius');
    expect(temperatureUnitFromAcceptLanguage('*')).toBe('celsius');
  });

  it('falls back to celsius for malformed headers', () => {
    expect(temperatureUnitFromAcceptLanguage(',,,')).toBe('celsius');
    expect(temperatureUnitFromAcceptLanguage('  ')).toBe('celsius');
  });
});

describe('usesTwelveHourClock', () => {
  it('is true for US-region locales', () => {
    expect(usesTwelveHourClock('en-US')).toBe(true);
    expect(usesTwelveHourClock('EN-us')).toBe(true);
    expect(usesTwelveHourClock('en-US,en;q=0.9')).toBe(true);
  });

  it('is false for other regions and region-less tags', () => {
    expect(usesTwelveHourClock('en-GB,en;q=0.9')).toBe(false);
    expect(usesTwelveHourClock('de-DE')).toBe(false);
    expect(usesTwelveHourClock('en')).toBe(false);
  });

  it('is false for missing, empty, or malformed headers', () => {
    expect(usesTwelveHourClock(undefined)).toBe(false);
    expect(usesTwelveHourClock('')).toBe(false);
    expect(usesTwelveHourClock('*')).toBe(false);
    expect(usesTwelveHourClock(',,,')).toBe(false);
  });
});

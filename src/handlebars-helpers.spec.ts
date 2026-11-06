import * as Handlebars from 'handlebars';

describe('Handlebars Helpers (or & ifInArray)', () => {
  beforeAll(() => {
    Handlebars.registerHelper('or', function (...args: unknown[]) {
      const values = args.slice(0, -1);
      return values.find(Boolean) ?? false;
    });

    Handlebars.registerHelper(
      'ifInArray',
      function (
        item: string,
        value: unknown,
        options: Handlebars.HelperOptions,
      ) {
        if (!value) return options.inverse(this);
        let arr: string[] = [];
        if (Array.isArray(value)) {
          arr = value.map(String);
        } else if (typeof value === 'string') {
          arr = value.split(',').map((s) => s.trim());
        }
        return arr.includes(item) ? options.fn(this) : options.inverse(this);
      },
    );
  });

  it('correctly matches item when passed comma-separated string or array via or helper', () => {
    const template = Handlebars.compile(
      '{{#ifInArray "Casual" (or outfit.looks outfit.look)}}checked{{/ifInArray}}',
    );

    // Case 1: outfit has looks comma-separated
    expect(template({ outfit: { looks: 'Casual,Formal' } })).toBe('checked');

    // Case 2: outfit has legacy look
    expect(template({ outfit: { look: 'Casual' } })).toBe('checked');

    // Case 3: outfit has looks as array
    expect(template({ outfit: { looks: ['Casual', 'Vintage'] } })).toBe(
      'checked',
    );

    // Case 4: item is not in looks
    expect(template({ outfit: { looks: 'Formal,Classic' } })).toBe('');

    // Case 5: neither looks nor look is defined
    expect(template({ outfit: {} })).toBe('');
  });

  it('safely handles non-string and boolean values without throwing TypeError', () => {
    const template = Handlebars.compile(
      '{{#ifInArray "Casual" (or outfit.looks outfit.look)}}checked{{/ifInArray}}',
    );

    expect(() => template({ outfit: { looks: true } })).not.toThrow();
    expect(template({ outfit: { looks: true } })).toBe('');
    expect(() => template({ outfit: { looks: 12345 } })).not.toThrow();
    expect(template({ outfit: { looks: 12345 } })).toBe('');
    expect(() => template({ outfit: { looks: null } })).not.toThrow();
    expect(template({ outfit: { looks: null } })).toBe('');
  });
});

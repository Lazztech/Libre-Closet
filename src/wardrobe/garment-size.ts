export function normalizeSize(input?: string): string | undefined {
  if (!input) return undefined;
  const s = input
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '');
  if (['xxxxxl', '5xl', '5xlarge', 'xxxxxlarge'].includes(s)) return '5X-Large';
  if (['xxxxl', '4xl', '4xlarge', 'xxxxlarge'].includes(s)) return '4X-Large';
  if (['xxxl', '3xl', '3xlarge', 'xxxlarge'].includes(s)) return '3X-Large';
  if (['xxl', '2xl', '2xlarge', 'xxlarge'].includes(s)) return 'XX-Large';
  if (['xl', 'xlarge'].includes(s)) return 'X-Large';
  if (['l', 'large'].includes(s)) return 'Large';
  if (['m', 'medium'].includes(s)) return 'Medium';
  if (['s', 'small'].includes(s)) return 'Small';
  if (['xs', 'xsmall'].includes(s)) return 'X-Small';
  if (['xxs', '2xs', '2xsmall', 'xxsmall'].includes(s)) return 'XX-Small';
  return input.trim();
}

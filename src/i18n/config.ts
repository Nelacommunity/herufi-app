export const LOCALES = ['en', 'sw'] as const;
export type Locale = (typeof LOCALES)[number];
export const LOCALE_NAMES: Record<Locale, string> = { en: 'English', sw: 'Kiswahili' };

export function isLocale(v: unknown): v is Locale {
  return v === 'en' || v === 'sw';
}

/** Fill {placeholders} in a template. */
export function fmt(template: string, vars: Record<string, string | number> = {}) {
  return template.replace(/\{(\w+)\}/g, (_, k) => (k in vars ? String(vars[k]) : `{${k}}`));
}

export function plural(pair: readonly string[], n: number, vars: Record<string, string | number> = {}) {
  return fmt(n === 1 ? pair[0] : pair[1] ?? pair[0], { n: n.toLocaleString('en-US'), ...vars });
}

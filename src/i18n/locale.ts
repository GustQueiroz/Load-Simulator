export const LOCALES = ['pt-BR', 'en'] as const;

export type Locale = (typeof LOCALES)[number];

/**
 * English is the locale baked into the static HTML: it is what a first-time
 * visitor of the public demo gets. A Portuguese browser switches before the
 * first paint (see `I18nProvider`), so nobody sees a flash of the wrong one.
 */
export const DEFAULT_LOCALE: Locale = 'en';

export const LOCALE_LABEL: Record<Locale, string> = {
  'pt-BR': 'Português',
  en: 'English',
};

export const LOCALE_SHORT: Record<Locale, string> = {
  'pt-BR': 'PT',
  en: 'EN',
};

const STORAGE_KEY = 'system-design-simulator:locale';

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/**
 * Resolution order: explicit `?lang=` (so a demo link can pin a language),
 * then the visitor's previous choice, then the browser, then the default.
 */
export function detectLocale(): Locale {
  if (typeof window === 'undefined') return DEFAULT_LOCALE;

  const fromQuery = new URLSearchParams(window.location.search).get('lang');
  if (isLocale(fromQuery)) return fromQuery;

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    // Private mode: fall through to browser detection.
  }

  return window.navigator.language.toLowerCase().startsWith('pt') ? 'pt-BR' : DEFAULT_LOCALE;
}

export function persistLocale(locale: Locale): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // Remembering the choice is a convenience, never a blocker.
  }
}

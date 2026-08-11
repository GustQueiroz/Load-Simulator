'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { setFormatLocale } from '@/lib/format';

import { DEFAULT_LOCALE, detectLocale, persistLocale, type Locale } from './locale';
import { en } from './messages/en';
import { ptBR, type MessageKey, type Messages } from './messages/pt-BR';

const CATALOGUES: Record<Locale, Messages> = {
  'pt-BR': ptBR,
  en,
};

export type TranslateParams = Record<string, string | number>;
export type Translate = (key: MessageKey, params?: TranslateParams) => string;

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: Translate;

  resolved: boolean;
}

const I18nContext = createContext<I18nContextValue | null>(null);

const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const [resolved, setResolved] = useState(false);

  useIsomorphicLayoutEffect(() => {
    const detected = detectLocale();
    setLocaleState(detected);
    setFormatLocale(detected);
    document.documentElement.lang = detected;

    setResolved(true);
  }, []);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    setFormatLocale(next);
    persistLocale(next);
    document.documentElement.lang = next;
  }, []);

  const t = useCallback<Translate>(
    (key, params) => interpolate(CATALOGUES[locale][key] ?? key, params),
    [locale],
  );

  const value = useMemo(
    () => ({ locale, setLocale, t, resolved }),
    [locale, setLocale, t, resolved],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const value = useContext(I18nContext);
  if (!value) throw new Error('useI18n must be used inside <I18nProvider>');
  return value;
}

export function useT(): Translate {
  return useI18n().t;
}

function interpolate(template: string, params?: TranslateParams): string {
  if (!params) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match,
  );
}

export type { MessageKey };

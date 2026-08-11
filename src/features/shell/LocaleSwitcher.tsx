'use client';

import { Languages } from 'lucide-react';

import { useI18n } from '@/i18n/I18nProvider';
import { LOCALES, LOCALE_LABEL, LOCALE_SHORT, type Locale } from '@/i18n/locale';

export function LocaleSwitcher() {
  const { locale, setLocale, t } = useI18n();

  return (
    <label className="relative flex shrink-0 items-center" title={t('toolbar.language')}>
      <Languages className="pointer-events-none absolute left-2 size-3.5 text-faint" aria-hidden />
      <span className="sr-only">{t('toolbar.language')}</span>
      <select
        value={locale}
        onChange={(event) => setLocale(event.target.value as Locale)}
        className="h-9 appearance-none rounded-lg border border-line bg-raised pr-2 pl-7 text-xs text-ink transition-colors hover:border-sky-500/40 focus-visible:border-sky-400 focus-visible:outline-none"
      >
        {LOCALES.map((option) => (
          <option key={option} value={option} title={LOCALE_LABEL[option]}>
            {LOCALE_SHORT[option]}
          </option>
        ))}
      </select>
    </label>
  );
}

import { cleanup, render } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { afterEach } from 'vitest';

import { I18nProvider } from '@/i18n/I18nProvider';
import type { Locale } from '@/i18n/locale';

afterEach(() => {
  cleanup();
});

export function renderWithI18n(ui: ReactElement, locale: Locale = 'pt-BR') {
  return render(<I18nProvider initialLocale={locale}>{ui}</I18nProvider>);
}

export function withI18n(children: ReactNode, locale: Locale = 'pt-BR') {
  return <I18nProvider initialLocale={locale}>{children}</I18nProvider>;
}

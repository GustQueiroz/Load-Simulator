'use client';

import { useEffect, useRef } from 'react';

import { readShareFromLocation } from '@/application/serialization/share-url';
import { useI18n } from '@/i18n/I18nProvider';

import { startAutosave } from './bootstrap/autosave';
import { hydrateProjectFromBoot } from './bootstrap/hydrate-project';

export function useProjectBootstrap(): void {
  const { t, resolved } = useI18n();
  const bootstrapped = useRef(false);
  const tRef = useRef(t);

  useEffect(() => {
    tRef.current = t;
  }, [t]);

  useEffect(() => {
    if (!resolved || bootstrapped.current) return;
    bootstrapped.current = true;
    const translate = tRef.current;

    void (async () => {
      const shared = await readShareFromLocation();
      await hydrateProjectFromBoot(shared, translate);
    })();
  }, [resolved]);

  useEffect(() => startAutosave(), []);
}

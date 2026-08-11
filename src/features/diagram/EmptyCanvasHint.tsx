'use client';

import { MousePointerClick } from 'lucide-react';

import { PRESETS } from '@/application/presets/presets';
import { Button } from '@/components/ui/Button';
import { useLoadPreset } from '@/features/onboarding/useLoadPreset';
import { useT } from '@/i18n/I18nProvider';
import { presetDescriptionKey, presetNameKey } from '@/i18n/keys';

export function EmptyCanvasHint() {
  const t = useT();
  const loadPreset = useLoadPreset();
  const lesson = PRESETS[0];

  return (
    <div className="pointer-events-auto max-w-sm rounded-2xl border border-line bg-panel/90 p-5 text-center shadow-2xl backdrop-blur">
      <MousePointerClick className="mx-auto mb-3 size-6 text-sky-400" aria-hidden />
      <h2 className="text-base font-semibold text-ink">{t('empty.title')}</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{t('empty.body')}</p>
      <Button variant="primary" size="sm" className="mt-4" onClick={() => loadPreset(lesson.id)}>
        {t('empty.lessonCta')}
      </Button>
      <p className="mt-2 text-[10.5px] leading-snug text-faint">
        <span className="font-medium text-muted">{t(presetNameKey(lesson.id))}.</span>{' '}
        {t(presetDescriptionKey(lesson.id))}
      </p>
    </div>
  );
}

'use client';

import { MousePointerClick } from 'lucide-react';

import { PRESETS } from '@/application/presets/presets';
import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n/I18nProvider';
import { presetNameKey, presetVocabulary } from '@/i18n/keys';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';

export function EmptyCanvasHint() {
  const t = useT();
  const loadSnapshot = useSimulatorStore((state) => state.loadSnapshot);
  const requestFitView = useSimulatorStore((state) => state.requestFitView);
  const reset = useSimulatorStore((state) => state.reset);
  const preset = PRESETS[0];
  const presetName = t(presetNameKey(preset.id));

  return (
    <div className="pointer-events-auto max-w-sm rounded-2xl border border-line bg-panel/90 p-5 text-center shadow-2xl backdrop-blur">
      <MousePointerClick className="mx-auto mb-3 size-6 text-sky-400" aria-hidden />
      <h2 className="text-base font-semibold text-ink">{t('empty.title')}</h2>
      <p className="mt-1.5 text-xs leading-relaxed text-muted">{t('empty.body')}</p>
      <Button
        variant="primary"
        size="sm"
        className="mt-4"
        onClick={() => {

          reset();
          loadSnapshot(preset.build(presetVocabulary(t)), presetName);
          requestFitView();
        }}
      >
        {t('empty.cta', { preset: presetName })}
      </Button>
    </div>
  );
}

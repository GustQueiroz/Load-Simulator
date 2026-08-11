'use client';

import { Maximize2, Pause, Play, RotateCcw, X } from 'lucide-react';

import { PRESETS } from '@/application/presets/presets';
import { Button } from '@/components/ui/Button';
import { useT } from '@/i18n/I18nProvider';
import { presetNameKey, presetVocabulary } from '@/i18n/keys';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { formatClock } from '@/lib/format';

/** Minimal controls for presenting: play, reset, reframe, switch scenario, exit. */
export function PresentationBar() {
  const t = useT();
  const status = useSimulatorStore((state) => state.status);
  const elapsedSeconds = useSimulatorStore((state) => state.elapsedSeconds);
  const name = useSimulatorStore((state) => state.name);
  const toggleRunning = useSimulatorStore((state) => state.toggleRunning);
  const reset = useSimulatorStore((state) => state.reset);
  const requestFitView = useSimulatorStore((state) => state.requestFitView);
  const loadSnapshot = useSimulatorStore((state) => state.loadSnapshot);
  const setPresentationMode = useSimulatorStore((state) => state.setPresentationMode);

  const isRunning = status === 'running';

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel px-4">
      <Button
        variant={isRunning ? 'danger' : 'primary'}
        icon={isRunning ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        onClick={toggleRunning}
      >
        {isRunning ? t('toolbar.pause') : t('toolbar.play')}
      </Button>
      <Button variant="subtle" icon={<RotateCcw className="size-3.5" />} onClick={reset}>
        {t('toolbar.reset')}
      </Button>
      <Button variant="subtle" icon={<Maximize2 className="size-3.5" />} onClick={requestFitView}>
        {t('toolbar.fit')}
      </Button>

      <span className="font-mono text-xs text-muted tabular-nums">
        {formatClock(elapsedSeconds)}
      </span>

      <h1 className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-ink">{name}</h1>

      <select
        aria-label={t('toolbar.scenarioLabel')}
        value=""
        className="h-9 rounded-lg border border-line bg-raised px-2.5 text-xs text-ink focus-visible:border-sky-400 focus-visible:outline-none"
        onChange={(event) => {
          const preset = PRESETS.find((item) => item.id === event.target.value);
          if (!preset) return;
          useSimulatorStore.getState().reset();
          loadSnapshot(preset.build(presetVocabulary(t)), t(presetNameKey(preset.id)));
          requestFitView();
        }}
      >
        <option value="">{t('toolbar.scenario')}</option>
        {PRESETS.map((preset) => (
          <option key={preset.id} value={preset.id}>
            {t(presetNameKey(preset.id))}
          </option>
        ))}
      </select>

      <Button
        variant="ghost"
        size="sm"
        icon={<X className="size-3.5" />}
        onClick={() => setPresentationMode(false)}
      >
        {t('toolbar.exit')}
      </Button>
    </header>
  );
}

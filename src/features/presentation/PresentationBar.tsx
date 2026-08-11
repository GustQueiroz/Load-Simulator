'use client';

import { Maximize2, Pause, Play, RotateCcw, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { LessonPicker } from '@/features/onboarding/LessonPicker';
import { useT } from '@/i18n/I18nProvider';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { formatClock } from '@/lib/format';

export function PresentationBar() {
  const t = useT();
  const status = useSimulatorStore((state) => state.status);
  const elapsedSeconds = useSimulatorStore((state) => state.elapsedSeconds);
  const name = useSimulatorStore((state) => state.name);
  const toggleRunning = useSimulatorStore((state) => state.toggleRunning);
  const reset = useSimulatorStore((state) => state.reset);
  const requestFitView = useSimulatorStore((state) => state.requestFitView);
  const setPresentationMode = useSimulatorStore((state) => state.setPresentationMode);

  const isRunning = status === 'running';

  return (
    <header className="flex h-14 shrink-0 items-center gap-3 border-b border-line bg-panel px-4">
      <Button
        variant={isRunning ? 'danger' : 'primary'}
        icon={isRunning ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        onClick={toggleRunning}
        aria-label={isRunning ? t('toolbar.pause') : t('toolbar.play')}
      >
        {isRunning ? t('toolbar.pause') : t('toolbar.play')}
      </Button>
      <Button
        variant="subtle"
        icon={<RotateCcw className="size-3.5" />}
        onClick={reset}
        aria-label={t('toolbar.reset')}
      >
        {t('toolbar.reset')}
      </Button>
      <Button
        variant="subtle"
        icon={<Maximize2 className="size-3.5" />}
        onClick={requestFitView}
        aria-label={t('toolbar.fit')}
      >
        {t('toolbar.fit')}
      </Button>

      <span className="font-mono text-xs text-muted tabular-nums" aria-label={t('toolbar.elapsed')}>
        {formatClock(elapsedSeconds)}
      </span>

      <h1 className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-ink">{name}</h1>

      <LessonPicker />

      <Button
        variant="ghost"
        size="sm"
        icon={<X className="size-3.5" />}
        onClick={() => setPresentationMode(false)}
        aria-label={t('toolbar.exit')}
      >
        {t('toolbar.exit')}
      </Button>
    </header>
  );
}

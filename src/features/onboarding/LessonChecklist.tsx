'use client';

import { Check, ListChecks, X } from 'lucide-react';

import { useT } from '@/i18n/I18nProvider';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { cn } from '@/lib/cn';

import { useOnboardingStore } from './onboarding-store';

export function LessonChecklist() {
  const t = useT();
  const presenting = useSimulatorStore((state) => state.presentationMode);
  const visible = useOnboardingStore((state) => state.checklistVisible);
  const dismiss = useOnboardingStore((state) => state.dismissChecklist);
  const tourOpen = useOnboardingStore((state) => state.tourOpen);

  const started = useSimulatorStore(
    (state) => state.status === 'running' || state.status === 'paused' || state.tick > 0,
  );
  const tweaked = useSimulatorStore((state) => state.isDirty && state.tick > 0);
  const observed = useSimulatorStore(
    (state) => Boolean(state.system.bottleneckNodeId) || state.events.length > 0,
  );

  if (presenting || tourOpen || !visible) return null;

  const steps = [
    { id: 'start', done: started, label: t('checklist.step.start') },
    { id: 'tweak', done: tweaked, label: t('checklist.step.tweak') },
    { id: 'observe', done: observed, label: t('checklist.step.observe') },
  ] as const;

  const doneCount = steps.filter((step) => step.done).length;

  return (
    <aside
      className="pointer-events-auto absolute right-3 bottom-3 z-30 hidden w-[260px] rounded-xl border border-line bg-panel/95 shadow-xl shadow-black/40 backdrop-blur md:block max-lg:bottom-16"
      aria-label={t('checklist.title')}
    >
      <header className="flex items-center gap-2 border-b border-line/70 px-3 py-2">
        <ListChecks className="size-3.5 text-sky-400" aria-hidden />
        <h2 className="flex-1 text-[11px] font-semibold text-ink">{t('checklist.title')}</h2>
        <span className="font-mono text-[10px] text-faint tabular-nums">
          {doneCount}/{steps.length}
        </span>
        <button
          type="button"
          className="grid size-6 place-items-center rounded-md text-faint transition-colors hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
          aria-label={t('checklist.dismiss')}
          onClick={dismiss}
        >
          <X className="size-3" />
        </button>
      </header>
      <ol className="space-y-1.5 px-3 py-2.5">
        {steps.map((step) => (
          <li key={step.id} className="flex items-start gap-2 text-[11px] leading-snug">
            <span
              className={cn(
                'mt-0.5 grid size-4 shrink-0 place-items-center rounded-full border',
                step.done
                  ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300'
                  : 'border-line text-transparent',
              )}
              aria-hidden
            >
              <Check className="size-2.5" />
            </span>
            <span className={step.done ? 'text-muted line-through' : 'text-ink'}>{step.label}</span>
            <span className="sr-only">
              {step.done ? t('checklist.done') : t('checklist.todo')}
            </span>
          </li>
        ))}
      </ol>
      <p className="border-t border-line/70 px-3 py-2 text-[10px] leading-snug text-faint">
        {t('checklist.hint')}
      </p>
    </aside>
  );
}

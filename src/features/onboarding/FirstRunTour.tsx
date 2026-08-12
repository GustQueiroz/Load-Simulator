'use client';

import { useState } from 'react';
import { BookOpen, ChevronRight, X } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { useModalDialog } from '@/components/ui/useModalDialog';
import { useStartLesson } from '@/features/lessons/useStartLesson';
import { useT } from '@/i18n/I18nProvider';

import { useOnboardingStore } from './onboarding-store';

const STEPS = [
  { title: 'tour.step1.title', body: 'tour.step1.body' },
  { title: 'tour.step2.title', body: 'tour.step2.body' },
  { title: 'tour.step3.title', body: 'tour.step3.body' },
  { title: 'tour.step4.title', body: 'tour.step4.body' },
] as const;

export function FirstRunTour() {
  const t = useT();
  const open = useOnboardingStore((state) => state.tourOpen);
  const closeTour = useOnboardingStore((state) => state.closeTour);
  const startLesson = useStartLesson();
  const [step, setStep] = useState(0);
  const dialogRef = useModalDialog<HTMLDivElement>({
    open,
    onClose: () => {
      setStep(0);
      closeTour();
    },
  });

  if (!open) return null;

  const last = step >= STEPS.length - 1;
  const current = STEPS[step];

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px] focus:outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <div className="w-full max-w-md rounded-2xl border border-line bg-panel shadow-2xl shadow-black/50">
        <header className="flex items-start gap-3 border-b border-line/70 px-4 py-3">
          <span className="mt-0.5 grid size-8 place-items-center rounded-lg bg-sky-500/15 text-sky-300">
            <BookOpen className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold tracking-wider text-faint uppercase">
              {t('tour.kicker', { step: step + 1, total: STEPS.length })}
            </p>
            <h2 id="tour-title" className="text-sm font-semibold text-ink">
              {t(current.title)}
            </h2>
          </div>
          <button
            type="button"
            className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            aria-label={t('tour.skip')}
            onClick={() => {
              setStep(0);
              closeTour();
            }}
          >
            <X className="size-3.5" />
          </button>
        </header>

        <p className="px-4 py-3 text-xs leading-relaxed text-muted">{t(current.body)}</p>

        <footer className="flex items-center justify-between gap-2 border-t border-line/70 px-4 py-3">
          <button
            type="button"
            className="text-[11px] text-faint transition-colors hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            onClick={() => {
              setStep(0);
              closeTour();
            }}
          >
            {t('tour.skip')}
          </button>
          <div className="flex items-center gap-2">
            {step > 0 ? (
              <Button variant="subtle" size="sm" onClick={() => setStep((value) => value - 1)}>
                {t('tour.back')}
              </Button>
            ) : null}
            <Button
              variant="primary"
              size="sm"
              icon={last ? undefined : <ChevronRight className="size-3.5" />}
              onClick={() => {
                if (!last) {
                  setStep((value) => value + 1);
                  return;
                }
                setStep(0);
                closeTour();
                startLesson('0.1');
              }}
            >
              {last ? t('tour.finishLesson') : t('tour.next')}
            </Button>
          </div>
        </footer>
      </div>
    </div>
  );
}

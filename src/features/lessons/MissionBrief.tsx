'use client';

import { Briefcase, Lock, X } from 'lucide-react';

import { lessonById } from '@/application/lessons';
import { Button } from '@/components/ui/Button';
import { useModalDialog } from '@/components/ui/useModalDialog';
import { useT, type MessageKey } from '@/i18n/I18nProvider';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { formatUsd } from '@/lib/format';

import { useLessonSessionStore } from './lesson-session-store';

export function MissionBrief() {
  const t = useT();
  const open = useLessonSessionStore((state) => state.briefOpen);
  const activeLessonId = useLessonSessionStore((state) => state.activeLessonId);
  const closeBrief = useLessonSessionStore((state) => state.closeBrief);
  const presenting = useSimulatorStore((state) => state.presentationMode);
  const dialogRef = useModalDialog<HTMLDivElement>({ open, onClose: closeBrief });

  if (!open || !activeLessonId || presenting) return null;
  const lesson = lessonById(activeLessonId);
  if (!lesson || lesson.mode !== 'mission') return null;

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[88] flex items-center justify-center bg-black/60 p-4 backdrop-blur-[2px] focus:outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="mission-brief-title"
    >
      <div className="flex max-h-[min(90vh,640px)] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl shadow-black/50">
        <header className="flex items-start gap-3 border-b border-line/70 px-4 py-3">
          <span className="mt-0.5 grid size-8 place-items-center rounded-lg bg-amber-500/15 text-amber-300">
            <Briefcase className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold tracking-wider text-faint uppercase">
              {t('mission.kicker', { id: activeLessonId })}
            </p>
            <h2 id="mission-brief-title" className="text-sm font-semibold text-ink">
              {t(`lesson.${activeLessonId}.title` as MessageKey)}
            </h2>
          </div>
          <button
            type="button"
            className="grid size-7 place-items-center rounded-md text-faint hover:bg-raised hover:text-ink"
            aria-label={t('mission.close')}
            onClick={closeBrief}
          >
            <X className="size-3.5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-[11.5px] leading-relaxed">
          <section>
            <h3 className="mb-1 text-[10px] font-semibold tracking-wider text-faint uppercase">
              {t('mission.situation')}
            </h3>
            <p className="text-muted">{t(`lesson.${activeLessonId}.brief.situation` as MessageKey)}</p>
          </section>
          <section>
            <h3 className="mb-1 text-[10px] font-semibold tracking-wider text-faint uppercase">
              {t('mission.objective')}
            </h3>
            <p className="text-ink">{t(`lesson.${activeLessonId}.brief.objective` as MessageKey)}</p>
          </section>
          <section>
            <h3 className="mb-1 text-[10px] font-semibold tracking-wider text-faint uppercase">
              {t('mission.constraints')}
            </h3>
            <p className="text-muted">{t(`lesson.${activeLessonId}.brief.constraints` as MessageKey)}</p>
          </section>

          <div className="flex flex-wrap gap-2 pt-1">
            {lesson.budgetMonthlyUsd !== undefined ? (
              <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/30 bg-amber-500/10 px-2 py-1 text-[10.5px] text-amber-200">
                {t('mission.budget', { amount: formatUsd(lesson.budgetMonthlyUsd) })}
              </span>
            ) : null}
            <span className="inline-flex items-center gap-1 rounded-md border border-line bg-raised px-2 py-1 text-[10.5px] text-faint">
              <Lock className="size-3" aria-hidden />
              {t('mission.trafficLocked')}
            </span>
          </div>
        </div>

        <footer className="flex items-center justify-end gap-2 border-t border-line/70 px-4 py-3">
          <Button size="sm" variant="primary" onClick={closeBrief}>
            {t('mission.accept')}
          </Button>
        </footer>
      </div>
    </div>
  );
}

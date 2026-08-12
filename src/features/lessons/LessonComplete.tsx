'use client';

import { PartyPopper, X } from 'lucide-react';

import { nextLessonId } from '@/application/lessons';
import { Button } from '@/components/ui/Button';
import { useModalDialog } from '@/components/ui/useModalDialog';
import { useT, type MessageKey } from '@/i18n/I18nProvider';

import { useLessonSessionStore } from './lesson-session-store';
import { useStartLesson } from './useStartLesson';

export function LessonComplete() {
  const t = useT();
  const open = useLessonSessionStore((state) => state.completedOpen);
  const justCompletedId = useLessonSessionStore((state) => state.justCompletedId);
  const justCompletedStars = useLessonSessionStore((state) => state.justCompletedStars);
  const dismissComplete = useLessonSessionStore((state) => state.dismissComplete);
  const exitLesson = useLessonSessionStore((state) => state.exitLesson);
  const openMap = useLessonSessionStore((state) => state.openMap);
  const startLesson = useStartLesson();
  const dialogRef = useModalDialog<HTMLDivElement>({ open, onClose: dismissComplete });

  if (!open || !justCompletedId) return null;

  const next = nextLessonId(justCompletedId);

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/55 p-4 backdrop-blur-[2px] focus:outline-none"
      role="dialog"
      aria-modal="true"
      aria-labelledby="lesson-complete-title"
    >
      <div className="w-full max-w-sm rounded-2xl border border-line bg-panel shadow-2xl shadow-black/50">
        <header className="flex items-start gap-3 border-b border-line/70 px-4 py-3">
          <span className="mt-0.5 grid size-8 place-items-center rounded-lg bg-emerald-500/15 text-emerald-300">
            <PartyPopper className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold tracking-wider text-faint uppercase">
              {t('lesson.complete.kicker')}
            </p>
            <h2 id="lesson-complete-title" className="text-sm font-semibold text-ink">
              {t(`lesson.${justCompletedId}.title` as MessageKey)}
            </h2>
            <p className="mt-1 text-amber-300" aria-label={t('lesson.complete.stars', { count: justCompletedStars })}>
              {'★'.repeat(justCompletedStars)}
              <span className="text-faint">{'★'.repeat(3 - justCompletedStars)}</span>
            </p>
          </div>
          <button
            type="button"
            className="grid size-7 place-items-center rounded-md text-faint hover:bg-raised hover:text-ink"
            aria-label={t('lesson.complete.close')}
            onClick={dismissComplete}
          >
            <X className="size-3.5" />
          </button>
        </header>

        <p className="px-4 py-3 text-xs leading-relaxed text-muted">
          {t('lesson.complete.body')}
        </p>

        <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-line/70 px-4 py-3">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              dismissComplete();
              exitLesson();
              openMap();
            }}
          >
            {t('lesson.complete.map')}
          </Button>
          {next ? (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                dismissComplete();
                startLesson(next);
              }}
            >
              {t('lesson.complete.next', { id: next })}
            </Button>
          ) : (
            <Button
              size="sm"
              variant="primary"
              onClick={() => {
                dismissComplete();
                exitLesson();
                openMap();
              }}
            >
              {t('lesson.complete.worldDone')}
            </Button>
          )}
        </footer>
      </div>
    </div>
  );
}

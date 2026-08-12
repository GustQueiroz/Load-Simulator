'use client';

import { Lightbulb } from 'lucide-react';

import { HINT_LEVELS, hintKey, type LessonId } from '@/application/lessons';
import { useT, type MessageKey } from '@/i18n/I18nProvider';

import { useLessonSessionStore } from './lesson-session-store';

interface LessonHintsProps {
  lessonId: LessonId;
}

/**
 * Help, on request and one step at a time.
 *
 * Being stuck with no way forward is where a learner quits, but a hint handed
 * over unasked removes the lesson. So: always available, never automatic, and
 * the first level only points at what to look at.
 */
export function LessonHints({ lessonId }: LessonHintsProps) {
  const t = useT();
  const revealed = useLessonSessionStore((state) => state.hintsRevealed);
  const revealHint = useLessonSessionStore((state) => state.revealHint);

  const levels = Array.from({ length: revealed }, (_, index) => index + 1);
  const exhausted = revealed >= HINT_LEVELS;

  return (
    <div className="mt-2 border-t border-line/70 pt-2">
      {levels.length > 0 ? (
        <ol className="mb-1.5 space-y-1" aria-live="polite">
          {levels.map((level) => (
            <li key={level} className="flex gap-1.5 text-[10.5px] leading-snug text-muted">
              <span className="shrink-0 font-mono text-amber-300/80">{level}.</span>
              <span>{t(hintKey(lessonId, level) as MessageKey)}</span>
            </li>
          ))}
        </ol>
      ) : null}

      {exhausted ? null : (
        <button
          type="button"
          onClick={revealHint}
          className="flex items-center gap-1 rounded-md px-1 py-0.5 text-[10.5px] font-medium text-amber-300/90 transition-colors hover:bg-raised hover:text-amber-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
        >
          <Lightbulb className="size-3" aria-hidden />
          {revealed === 0 ? t('lesson.hint.ask') : t('lesson.hint.more')}
        </button>
      )}
    </div>
  );
}

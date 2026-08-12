'use client';

import { Check, Lock, Map, X } from 'lucide-react';
import { memo, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import {
  isLessonUnlocked,
  lessonsInWorld,
  WORLDS,
  type LessonDefinition,
  type LessonId,
  type LessonProgressMap,
  type WorldId,
} from '@/application/lessons';
import { Button } from '@/components/ui/Button';
import { useModalDialog } from '@/components/ui/useModalDialog';
import { useT, type MessageKey } from '@/i18n/I18nProvider';
import { cn } from '@/lib/cn';

import { useLessonSessionStore } from './lesson-session-store';
import { useStartLesson } from './useStartLesson';

export function WorldMap() {
  const open = useLessonSessionStore((state) => state.mapOpen);
  const [warmed, setWarmed] = useState(false);

  useEffect(() => {
    const warm = () => setWarmed(true);
    if (typeof window.requestIdleCallback === 'function') {
      const id = window.requestIdleCallback(warm, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(warm, 300);
    return () => window.clearTimeout(id);
  }, []);

  if (typeof document === 'undefined') return null;
  if (!open && !warmed) return null;

  return createPortal(<WorldMapDialog open={open} />, document.body);
}

const WorldMapDialog = memo(function WorldMapDialog({ open }: { open: boolean }) {
  const t = useT();
  const closeMap = useLessonSessionStore((state) => state.closeMap);
  const progress = useLessonSessionStore((state) => state.progress);
  const startLesson = useStartLesson();
  const dialogRef = useModalDialog<HTMLDivElement>({ open, onClose: closeMap });

  return (
    <div
      ref={dialogRef}
      tabIndex={-1}
      className={cn(
        'fixed inset-0 z-[85] items-center justify-center bg-black/60 p-4 focus:outline-none',
        open ? 'flex' : 'hidden',
      )}
      role="dialog"
      aria-modal={open}
      aria-hidden={!open}
      aria-labelledby="world-map-title"
    >
      <div className="flex max-h-[min(90vh,720px)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-line bg-panel shadow-2xl shadow-black/50">
        <header className="flex items-start gap-3 border-b border-line/70 px-4 py-3">
          <span className="mt-0.5 grid size-8 place-items-center rounded-lg bg-sky-500/15 text-sky-300">
            <Map className="size-4" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <h2 id="world-map-title" className="text-sm font-semibold text-ink">
              {t('worldmap.title')}
            </h2>
            <p className="mt-0.5 text-[11px] leading-snug text-muted">{t('worldmap.subtitle')}</p>
          </div>
          <button
            type="button"
            className="grid size-7 place-items-center rounded-md text-faint transition-colors hover:bg-raised hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            aria-label={t('worldmap.close')}
            onClick={closeMap}
            tabIndex={open ? 0 : -1}
          >
            <X className="size-3.5" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-4 py-4">
          {WORLDS.map((world) => (
            <WorldSection
              key={world.id}
              worldId={world.id}
              progress={progress}
              onPlay={startLesson}
            />
          ))}
        </div>
      </div>
    </div>
  );
});

const WorldSection = memo(function WorldSection({
  worldId,
  progress,
  onPlay,
}: {
  worldId: WorldId;
  progress: LessonProgressMap;
  onPlay: (id: LessonId) => void;
}) {
  const t = useT();
  const lessons = lessonsInWorld(worldId);
  const done = useMemo(
    () => lessons.reduce((count, lesson) => count + (progress[lesson.id] ? 1 : 0), 0),
    [lessons, progress],
  );

  return (
    <section>
      <div className="mb-2 flex items-baseline justify-between gap-2">
        <div>
          <h3 className="text-xs font-semibold text-ink">
            {t(`world.${worldId}.name` as MessageKey)}
          </h3>
          <p className="text-[10.5px] leading-snug text-faint">
            {t(`world.${worldId}.blurb` as MessageKey)}
          </p>
        </div>
        <span className="shrink-0 font-mono text-[10px] text-faint tabular-nums">
          {done}/{lessons.length}
        </span>
      </div>

      <ol className="relative space-y-2 pl-2">
        <div className="absolute top-3 bottom-3 left-[18px] w-px bg-line" aria-hidden />
        {lessons.map((lesson, index) => (
          <LessonRow
            key={lesson.id}
            lesson={lesson}
            index={index}
            unlocked={isLessonUnlocked(lesson.id, progress)}
            entry={progress[lesson.id]}
            onPlay={onPlay}
          />
        ))}
      </ol>
    </section>
  );
});

const LessonRow = memo(function LessonRow({
  lesson,
  index,
  unlocked,
  entry,
  onPlay,
}: {
  lesson: LessonDefinition;
  index: number;
  unlocked: boolean;
  entry: LessonProgressMap[LessonId];
  onPlay: (id: LessonId) => void;
}) {
  const t = useT();
  const completed = Boolean(entry);

  return (
    <li className="relative flex items-stretch gap-3">
      <span
        className={cn(
          'relative z-10 mt-1 grid size-7 shrink-0 place-items-center rounded-full border text-[10px] font-bold',
          completed
            ? 'border-emerald-400/50 bg-emerald-500/20 text-emerald-300'
            : unlocked
              ? 'border-sky-400/50 bg-sky-500/15 text-sky-300'
              : 'border-line bg-raised text-faint',
        )}
      >
        {completed ? <Check className="size-3.5" /> : unlocked ? index + 1 : <Lock className="size-3" />}
      </span>

      <div
        className={cn(
          'min-w-0 flex-1 rounded-xl border px-3 py-2.5',
          completed
            ? 'border-emerald-500/25 bg-emerald-500/5'
            : unlocked
              ? 'border-line bg-raised/60'
              : 'border-line/60 bg-canvas/40 opacity-70',
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold text-ink">
              {lesson.id} · {t(`lesson.${lesson.id}.title` as MessageKey)}
            </p>
            <p className="mt-0.5 text-[10.5px] leading-snug text-muted">
              {t(`lesson.${lesson.id}.goal` as MessageKey)}
            </p>
          </div>
          {completed ? (
            <span
              className="flex shrink-0 items-center gap-0.5 text-amber-300"
              aria-label={t('worldmap.stars', { count: entry?.stars ?? 1 })}
            >
              {'★'.repeat(entry?.stars ?? 1)}
            </span>
          ) : null}
        </div>
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-[10px] text-faint">
            ~{lesson.minutes} {t('worldmap.minutes')}
          </span>
          <Button
            size="sm"
            variant={completed ? 'subtle' : 'primary'}
            disabled={!unlocked}
            onClick={() => onPlay(lesson.id)}
          >
            {completed ? t('worldmap.replay') : t('worldmap.play')}
          </Button>
        </div>
      </div>
    </li>
  );
});

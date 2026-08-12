'use client';

import { Briefcase, Flag, Map, X } from 'lucide-react';

import { lessonById } from '@/application/lessons';
import { Button } from '@/components/ui/Button';
import { useT, type MessageKey } from '@/i18n/I18nProvider';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { formatUsd } from '@/lib/format';

import { LessonHints } from './LessonHints';
import { useLessonSessionStore } from './lesson-session-store';

export function LessonHud() {
  const t = useT();
  const activeLessonId = useLessonSessionStore((state) => state.activeLessonId);
  const exitLesson = useLessonSessionStore((state) => state.exitLesson);
  const openMap = useLessonSessionStore((state) => state.openMap);
  const openBrief = useLessonSessionStore((state) => state.openBrief);
  const presenting = useSimulatorStore((state) => state.presentationMode);

  if (!activeLessonId || presenting) return null;
  const lesson = lessonById(activeLessonId);
  if (!lesson) return null;

  const isMission = lesson.mode === 'mission';

  return (
    <div className="pointer-events-auto absolute top-3 left-3 z-30 flex max-w-sm items-start gap-2 rounded-xl border border-line bg-panel/95 px-3 py-2 shadow-xl shadow-black/40 backdrop-blur">
      {isMission ? (
        <Briefcase className="mt-0.5 size-3.5 shrink-0 text-amber-300" aria-hidden />
      ) : (
        <Flag className="mt-0.5 size-3.5 shrink-0 text-sky-400" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-[10px] font-semibold tracking-wider text-faint uppercase">
          {isMission
            ? t('mission.hud.kicker', { id: activeLessonId })
            : t('lesson.hud.kicker', { id: activeLessonId })}
        </p>
        <p className="text-[11px] font-semibold text-ink">
          {t(`lesson.${activeLessonId}.title` as MessageKey)}
        </p>
        <p className="mt-0.5 text-[10.5px] leading-snug text-muted">
          {t(`lesson.${activeLessonId}.goal` as MessageKey)}
        </p>
        {isMission && lesson.budgetMonthlyUsd !== undefined ? (
          <p className="mt-1 font-mono text-[10px] text-amber-200/90">
            {t('mission.budget', { amount: formatUsd(lesson.budgetMonthlyUsd) })}
          </p>
        ) : null}
        {/* A guided lesson already walks the learner through it — the coach
            balloon is the hint. Missions are where someone is on their own. */}
        {isMission ? <LessonHints lessonId={activeLessonId} /> : null}
      </div>
      <div className="flex shrink-0 flex-col gap-1">
        {isMission ? (
          <button
            type="button"
            className="grid size-6 place-items-center rounded-md text-faint hover:bg-raised hover:text-ink"
            title={t('mission.reopen')}
            aria-label={t('mission.reopen')}
            onClick={openBrief}
          >
            <Briefcase className="size-3" />
          </button>
        ) : null}
        <button
          type="button"
          className="grid size-6 place-items-center rounded-md text-faint hover:bg-raised hover:text-ink"
          title={t('worldmap.title')}
          aria-label={t('worldmap.title')}
          onClick={openMap}
        >
          <Map className="size-3" />
        </button>
        <button
          type="button"
          className="grid size-6 place-items-center rounded-md text-faint hover:bg-raised hover:text-ink"
          title={t('lesson.exit')}
          aria-label={t('lesson.exit')}
          onClick={exitLesson}
        >
          <X className="size-3" />
        </button>
      </div>
    </div>
  );
}

export function LessonMapButton() {
  const t = useT();
  const openMap = useLessonSessionStore((state) => state.openMap);
  const activeLessonId = useLessonSessionStore((state) => state.activeLessonId);

  return (
    <Button
      variant={activeLessonId ? 'primary' : 'subtle'}
      size="sm"
      icon={<Map className="size-3.5" />}
      onClick={openMap}
      title={t('toolbar.worldmapTitle')}
    >
      <span className="hidden sm:inline">{t('toolbar.worldmap')}</span>
    </Button>
  );
}

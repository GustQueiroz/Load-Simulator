'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { ChevronRight, Sparkles, X } from 'lucide-react';

import { describeHoldProgress, evaluateWin, lessonById } from '@/application/lessons';
import type { AnyNodeConfig } from '@/domain/nodes/config';
import type { NodeKind } from '@/domain/simulation/node-kind';
import { Button } from '@/components/ui/Button';
import { useT, type MessageKey } from '@/i18n/I18nProvider';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { cn } from '@/lib/cn';

import { useLessonSessionStore } from './lesson-session-store';

interface AnchorBox {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function BalloonCoach() {
  const t = useT();
  const activeLessonId = useLessonSessionStore((state) => state.activeLessonId);
  const balloonIndex = useLessonSessionStore((state) => state.balloonIndex);
  const flags = useLessonSessionStore((state) => state.flags);
  const hold = useLessonSessionStore((state) => state.hold);
  const advanceBalloon = useLessonSessionStore((state) => state.advanceBalloon);
  const exitLesson = useLessonSessionStore((state) => state.exitLesson);
  const completedOpen = useLessonSessionStore((state) => state.completedOpen);
  const presenting = useSimulatorStore((state) => state.presentationMode);
  const elapsedSeconds = useSimulatorStore((state) => state.elapsedSeconds);
  const tick = useSimulatorStore((state) => state.tick);
  const nodeMetrics = useSimulatorStore((state) => state.nodeMetrics);
  const system = useSimulatorStore((state) => state.system);
  const status = useSimulatorStore((state) => state.status);
  const nodes = useSimulatorStore((state) => state.nodes);

  const lesson = activeLessonId ? lessonById(activeLessonId) : undefined;
  const balloon = lesson?.balloons[balloonIndex];
  const visible = Boolean(lesson && balloon && !completedOpen && !presenting);

  const [box, setBox] = useState<AnchorBox | null>(null);

  useEffect(() => {
    if (!visible || !balloon) return;

    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      setBox(resolveAnchorBox(balloon.anchor));
    };

    const raf = window.requestAnimationFrame(measure);
    const timer = window.setInterval(measure, 400);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(raf);
      window.clearInterval(timer);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [visible, balloon, balloonIndex, activeLessonId]);

  if (!visible || !lesson || !balloon) return null;

  const nodeMap = new Map<string, { kind: NodeKind; config: AnyNodeConfig }>();
  for (const node of nodes) {
    nodeMap.set(node.id, { kind: node.data.kind, config: node.data.config });
  }
  const observation = {
    status,
    tick,
    elapsedSeconds,
    flags,
    system,
    nodes: nodeMap,
    nodeMetrics,
    monthlyCostUsd: 0,
  };

  const canManualAdvance = !balloon.advanceWhen;
  const holdProgress = balloon.advanceWhen
    ? describeHoldProgress(balloon.advanceWhen, observation, hold)
    : null;
  const autoReady = balloon.advanceWhen
    ? evaluateWin(balloon.advanceWhen, observation, hold).ok
    : false;

  const placement = placeBalloon(box);

  return (
    <div className="pointer-events-none fixed inset-0 z-[70]">
      {box ? (
        <div
          className="absolute rounded-xl ring-2 ring-sky-400/70 ring-offset-2 ring-offset-transparent transition-all duration-300"
          style={{
            top: box.top - 4,
            left: box.left - 4,
            width: box.width + 8,
            height: box.height + 8,
          }}
          aria-hidden
        />
      ) : null}

      <div
        className="pointer-events-auto absolute w-[min(300px,calc(100vw-2rem))] rounded-2xl border border-sky-400/30 bg-panel shadow-2xl shadow-black/50"
        style={placement}
        role="status"
        aria-live="polite"
      >
        <header className="flex items-start gap-2 border-b border-line/70 px-3 py-2">
          <Sparkles className="mt-0.5 size-3.5 shrink-0 text-sky-400" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-semibold tracking-wider text-faint uppercase">
              {t('lesson.balloon.kicker', {
                step: balloonIndex + 1,
                total: lesson.balloons.length,
              })}
            </p>
            <h2 className="text-xs font-semibold text-ink">{t(balloon.titleKey as MessageKey)}</h2>
          </div>
          <button
            type="button"
            className="grid size-6 place-items-center rounded-md text-faint hover:bg-raised hover:text-ink"
            aria-label={t('lesson.exit')}
            onClick={exitLesson}
          >
            <X className="size-3" />
          </button>
        </header>

        <p className="px-3 py-2.5 text-[11px] leading-relaxed text-muted">
          {t(balloon.bodyKey as MessageKey)}
        </p>

        {holdProgress && holdProgress.required > 0 ? (
          <div className="px-3 pb-2">
            <div className="h-1.5 overflow-hidden rounded-full bg-raised">
              <div
                className="h-full rounded-full bg-sky-400 transition-all"
                style={{ width: `${(holdProgress.current / holdProgress.required) * 100}%` }}
              />
            </div>
            <p className="mt-1 text-[10px] text-faint">
              {t('lesson.hold', {
                current: holdProgress.current.toFixed(1),
                required: holdProgress.required,
              })}
            </p>
          </div>
        ) : null}

        <footer className="flex items-center justify-end gap-2 border-t border-line/70 px-3 py-2">
          {(canManualAdvance || autoReady) && balloonIndex < lesson.balloons.length - 1 ? (
            <Button
              size="sm"
              variant="primary"
              icon={<ChevronRight className="size-3.5" />}
              onClick={advanceBalloon}
            >
              {t('lesson.balloon.next')}
            </Button>
          ) : (
            <span className={cn('text-[10px] text-faint', autoReady && 'text-emerald-300')}>
              {autoReady ? t('lesson.balloon.done') : t('lesson.balloon.wait')}
            </span>
          )}
        </footer>
      </div>
    </div>
  );
}

function resolveAnchorBox(anchor: {
  type: string;
  target?: string;
  nodeId?: string;
  field?: string;
}): AnchorBox | null {
  let el: Element | null = null;
  if (anchor.type === 'toolbar' && anchor.target === 'start') {
    el = document.querySelector('[data-lesson-anchor="toolbar-start"]');
  } else if (anchor.type === 'panel' && anchor.target === 'system') {
    el = document.querySelector('[data-lesson-anchor="system-panel"]');
  } else if (anchor.type === 'node' && anchor.nodeId) {
    el = document.querySelector(`.react-flow__node[data-id="${anchor.nodeId}"]`);
  } else if (anchor.type === 'field' && anchor.nodeId && anchor.field) {
    el =
      document.querySelector(`[data-lesson-field="${anchor.nodeId}:${anchor.field}"]`) ??
      document.querySelector(`.react-flow__node[data-id="${anchor.nodeId}"]`);
  }
  if (!el) return null;
  const rect = el.getBoundingClientRect();
  if (rect.width === 0 && rect.height === 0) return null;
  return { top: rect.top, left: rect.left, width: rect.width, height: rect.height };
}

function placeBalloon(box: AnchorBox | null): CSSProperties {
  if (!box) {
    return { bottom: 24, right: 24 };
  }
  const balloonW = 300;
  const balloonH = 180;
  const gap = 12;
  let top = box.top + box.height + gap;
  let left = box.left + box.width / 2 - balloonW / 2;

  if (top + balloonH > window.innerHeight - 16) {
    top = box.top - balloonH - gap;
  }
  if (top < 16) top = 16;
  left = Math.max(16, Math.min(left, window.innerWidth - balloonW - 16));

  return { top, left };
}

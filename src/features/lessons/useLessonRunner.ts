'use client';

import { useEffect, useRef } from 'react';

import { costProfileOf } from '@/application/cost/profiles';
import { estimateMonthlyCost } from '@/application/cost/cost-engine';
import {
  evaluateWin,
  gradeLessonStars,
  lessonById,
  type HoldTracker,
  type LessonObservation,
} from '@/application/lessons';
import { toSimulationNodes } from '@/domain/diagram/diagram';
import type { AnyNodeConfig } from '@/domain/nodes/config';
import type { NodeKind } from '@/domain/simulation/node-kind';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';

import { bindLessonFrameListener } from './lesson-frame-bus';
import { useLessonSessionStore } from './lesson-session-store';

const EMPTY_HOLD: HoldTracker = { key: null, sinceElapsed: null };

export function useLessonRunner(): void {
  const prevStatus = useRef(useSimulatorStore.getState().status);
  const balloonHold = useRef<HoldTracker>(EMPTY_HOLD);
  const winHold = useRef<HoldTracker>(EMPTY_HOLD);
  const lastLessonId = useRef<string | null>(null);

  useEffect(() => {
    const onStatus = (status: ReturnType<typeof useSimulatorStore.getState>['status']) => {
      const session = useLessonSessionStore.getState();
      if (!session.activeLessonId) {
        prevStatus.current = status;
        return;
      }
      const previous = prevStatus.current;
      prevStatus.current = status;

      if (status === 'running' && previous !== 'running') {
        session.setFlag('started');
      }
      if (status === 'paused' && previous === 'running') {
        session.setFlag('paused');
      }
    };

    const unsubscribeStatus = useSimulatorStore.subscribe((state) => state.status, onStatus);

    const unsubscribeNodes = useSimulatorStore.subscribe(
      (state) => state.nodes,
      () => evaluateLessonFrame(balloonHold, winHold, lastLessonId),
    );

    const onFrame = () => evaluateLessonFrame(balloonHold, winHold, lastLessonId);
    bindLessonFrameListener(onFrame);

    return () => {
      unsubscribeStatus();
      unsubscribeNodes();
      bindLessonFrameListener(null);
    };
  }, []);
}

function evaluateLessonFrame(
  balloonHold: { current: HoldTracker },
  winHold: { current: HoldTracker },
  lastLessonId: { current: string | null },
): void {
  const session = useLessonSessionStore.getState();
  if (!session.activeLessonId || session.completedOpen) return;

  if (lastLessonId.current !== session.activeLessonId) {
    lastLessonId.current = session.activeLessonId;
    balloonHold.current = EMPTY_HOLD;
    winHold.current = EMPTY_HOLD;
  }

  const lesson = lessonById(session.activeLessonId);
  if (!lesson) return;

  const sim = useSimulatorStore.getState();
  let flags = session.flags;

  if (!flags.sawQueueDepth) {
    for (const node of sim.nodes) {
      if (node.data.kind !== 'messageQueue') continue;
      const depth = sim.nodeMetrics.get(node.id)?.queueDepth ?? 0;
      if (depth > 0) {
        session.setFlag('sawQueueDepth');
        flags = useLessonSessionStore.getState().flags;
        break;
      }
    }
  }

  const observation = buildObservation(sim, flags);

  if (lesson.mode === 'guided') {
    const balloon = lesson.balloons[session.balloonIndex];
    if (balloon?.advanceWhen) {
      const advanced = evaluateWin(balloon.advanceWhen, observation, balloonHold.current);
      balloonHold.current = advanced.hold;
      session.setHold(advanced.hold);
      if (advanced.ok) {
        balloonHold.current = EMPTY_HOLD;
        session.advanceBalloon();
      }
    } else {
      session.setHold(EMPTY_HOLD);
    }
  }

  const win = evaluateWin(lesson.win, observation, winHold.current);
  winHold.current = win.hold;
  if (win.ok) {
    const stars = gradeLessonStars(lesson, observation);
    session.completeActiveLesson(stars);
    if (useSimulatorStore.getState().status === 'running') {
      useSimulatorStore.getState().pause();
    }
  }
}

function buildObservation(
  sim: ReturnType<typeof useSimulatorStore.getState>,
  flags: LessonObservation['flags'],
): LessonObservation {
  const nodes = new Map<string, { kind: NodeKind; config: AnyNodeConfig }>();
  for (const node of sim.nodes) {
    nodes.set(node.id, { kind: node.data.kind, config: node.data.config });
  }

  const profile = costProfileOf(sim.cloud);
  const cost = estimateMonthlyCost(
    toSimulationNodes(sim.nodes),
    sim.nodeMetrics,
    profile,
  );

  return {
    status: sim.status,
    tick: sim.tick,
    elapsedSeconds: sim.elapsedSeconds,
    flags,
    system: sim.system,
    nodes,
    nodeMetrics: sim.nodeMetrics,
    monthlyCostUsd: cost.totalMonthlyUsd,
  };
}

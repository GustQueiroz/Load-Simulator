'use client';

import { useEffect, useRef } from 'react';

import { costProfileOf } from '@/application/cost/profiles';
import { estimateMonthlyCost } from '@/application/cost/cost-engine';
import {
  EMPTY_HOLD,
  evaluateAll,
  evaluateLesson,
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

export function useLessonRunner(): void {
  const prevStatus = useRef(useSimulatorStore.getState().status);
  const hold = useRef<HoldTracker>(EMPTY_HOLD);
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

      // A status change is itself something a lesson can win on — "start it,
      // find the bottleneck, pause" is the very first lesson. Frames stop the
      // moment the engine stops, so if the win is not evaluated here it is
      // never evaluated at all.
      evaluateLessonFrame(hold, lastLessonId);
    };

    const unsubscribeStatus = useSimulatorStore.subscribe((state) => state.status, onStatus);

    const unsubscribeNodes = useSimulatorStore.subscribe(
      (state) => state.nodes,
      () => evaluateLessonFrame(hold, lastLessonId),
    );

    const releaseFrames = bindLessonFrameListener(() => evaluateLessonFrame(hold, lastLessonId));

    return () => {
      unsubscribeStatus();
      unsubscribeNodes();
      releaseFrames();
    };
  }, []);
}

function evaluateLessonFrame(
  hold: { current: HoldTracker },
  lastLessonId: { current: string | null },
): void {
  const session = useLessonSessionStore.getState();
  if (!session.activeLessonId || session.completedOpen) return;

  if (lastLessonId.current !== session.activeLessonId) {
    lastLessonId.current = session.activeLessonId;
    hold.current = EMPTY_HOLD;
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

  // Win, star tiers and the current balloon share one tracker, so every
  // `sustained` in the lesson keeps accumulating on the same tick.
  const balloon =
    lesson.mode === 'guided' ? lesson.balloons[session.balloonIndex] : undefined;

  const evaluation = evaluateLesson(lesson, observation, hold.current);
  let nextHold = evaluation.hold;

  if (balloon?.advanceWhen) {
    const advanced = evaluateAll([balloon.advanceWhen], observation, hold.current);
    nextHold = mergeHolds(nextHold, advanced.hold);
    session.setHold(nextHold);
    if (advanced.results[0]) session.advanceBalloon();
  } else if (lesson.mode === 'guided') {
    session.setHold(nextHold);
  }

  hold.current = nextHold;

  if (evaluation.won) {
    session.completeActiveLesson(evaluation.stars, evaluation.tiers);
    if (useSimulatorStore.getState().status === 'running') {
      useSimulatorStore.getState().pause();
    }
  }
}

function mergeHolds(a: HoldTracker, b: HoldTracker): HoldTracker {
  return { since: { ...a.since, ...b.since } };
}

/**
 * The monthly cost only moves when the diagram or the measured traffic moves,
 * so it is cached across the ten frames a second the runner evaluates.
 */
let cachedCost: { nodes: unknown; metrics: unknown; cloud: string; value: number } | null = null;

function monthlyCostOf(sim: ReturnType<typeof useSimulatorStore.getState>): number {
  if (
    cachedCost &&
    cachedCost.nodes === sim.nodes &&
    cachedCost.metrics === sim.nodeMetrics &&
    cachedCost.cloud === sim.cloud
  ) {
    return cachedCost.value;
  }

  const value = estimateMonthlyCost(
    toSimulationNodes(sim.nodes),
    sim.nodeMetrics,
    costProfileOf(sim.cloud),
  ).infrastructureMonthlyUsd;

  cachedCost = { nodes: sim.nodes, metrics: sim.nodeMetrics, cloud: sim.cloud, value };
  return value;
}

function buildObservation(
  sim: ReturnType<typeof useSimulatorStore.getState>,
  flags: LessonObservation['flags'],
): LessonObservation {
  const nodes = new Map<string, { kind: NodeKind; config: AnyNodeConfig }>();
  for (const node of sim.nodes) {
    nodes.set(node.id, { kind: node.data.kind, config: node.data.config });
  }

  return {
    status: sim.status,
    tick: sim.tick,
    elapsedSeconds: sim.elapsedSeconds,
    flags,
    system: sim.system,
    nodes,
    nodeMetrics: sim.nodeMetrics,
    monthlyCostUsd: monthlyCostOf(sim),
  };
}

import { describe, expect, it } from 'vitest';

import {
  evaluateWin,
  isConditionMet,
  isLessonUnlocked,
  LESSON_IDS,
  LESSONS,
  lessonById,
  type LessonObservation,
  type WinCondition,
} from '@/application/lessons';
import { createDefaultConfig } from '@/domain/nodes/defaults';
import { createEmptyMetrics, createEmptySystemMetrics } from '@/domain/simulation/metrics';

function observation(partial: Partial<LessonObservation> = {}): LessonObservation {
  return {
    status: 'running',
    tick: 10,
    elapsedSeconds: 5,
    flags: { started: true, paused: false, sawQueueDepth: false },
    system: createEmptySystemMetrics(),
    nodes: new Map(),
    nodeMetrics: new Map(),
    monthlyCostUsd: 0,
    ...partial,
  };
}

describe('lesson catalogue', () => {
  it('lists Mundo 0–3 stages', () => {
    expect(LESSON_IDS).toHaveLength(16);
    expect(LESSONS).toHaveLength(16);
    expect(LESSONS.filter((lesson) => lesson.worldId === '2')).toHaveLength(5);
    expect(LESSONS.filter((lesson) => lesson.worldId === '3')).toHaveLength(4);
  });

  it('marks world 2–3 as mission mode without balloons', () => {
    for (const lesson of LESSONS.filter((item) => item.worldId === '2' || item.worldId === '3')) {
      expect(lesson.mode).toBe('mission');
      expect(lesson.balloons).toEqual([]);
      expect(lesson.locks?.trafficSources).toBe(true);
    }
  });

  it('unlocks linearly', () => {
    expect(isLessonUnlocked('0.1', {})).toBe(true);
    expect(isLessonUnlocked('0.2', {})).toBe(false);
    expect(isLessonUnlocked('0.2', { '0.1': { stars: 1, completedAt: 'x' } })).toBe(true);
    expect(isLessonUnlocked('1.1', { '0.1': { stars: 1, completedAt: 'x' } })).toBe(false);
  });

  it('builds a non-empty diagram for every lesson', () => {
    const vocabulary = {
      client: 'Client',
      button: 'Button',
      loadBalancer: 'LB',
      apiGateway: 'GW',
      server: 'Server',
      cache: 'Cache',
      messageQueue: 'Queue',
      database: 'DB',
      producer: 'Producer',
      worker: 'Worker',
    };
    for (const lesson of LESSONS) {
      const snapshot = lesson.build(vocabulary);
      expect(snapshot.nodes.length).toBeGreaterThan(0);
      if (lesson.id !== '3.4') {
        expect(snapshot.edges.length).toBeGreaterThan(0);
      }
    }
  });
});

describe('win predicates', () => {
  it('requires flags and bottleneck for lesson 0.1', () => {
    const win = lessonById('0.1')!.win;
    expect(
      isConditionMet(
        win,
        observation({
          flags: { started: true, paused: true, sawQueueDepth: false },
          system: { ...createEmptySystemMetrics(), bottleneckNodeId: 'server-1' },
        }),
      ),
    ).toBe(true);
  });

  it('tracks sustained utilization for lesson 0.2', () => {
    const win = lessonById('0.2')!.win;
    const metrics = new Map([
      ['server-1', { ...createEmptyMetrics(), utilization: 1.2, status: 'critical' as const }],
    ]);
    const obs = observation({
      elapsedSeconds: 1,
      nodeMetrics: metrics,
      flags: { started: true, paused: false, sawQueueDepth: false },
    });

    const first = evaluateWin(win, obs, { key: null, sinceElapsed: null });
    expect(first.ok).toBe(false);

    const held = evaluateWin(win, { ...obs, elapsedSeconds: 4.5 }, first.hold);
    expect(held.ok).toBe(true);
  });

  it('passes lesson 1.3 when hit rate and DB util meet the bar', () => {
    const win = lessonById('1.3')!.win;
    const nodes = new Map([
      ['cache-1', { kind: 'cache' as const, config: { ...createDefaultConfig('cache', 'Cache'), hitRate: 0.9 } }],
      ['db-1', { kind: 'database' as const, config: createDefaultConfig('database', 'DB') }],
    ]);

    const condition: WinCondition = win;
    expect(
      isConditionMet(
        condition,
        observation({
          nodes,
          nodeMetrics: new Map([
            ['db-1', { ...createEmptyMetrics(), utilization: 0.4, status: 'normal' }],
          ]),
        }),
      ),
    ).toBe(true);
  });

  it('supports failure-ratio and monthly-cost predicates', () => {
    expect(
      isConditionMet(
        { type: 'failure-ratio', op: 'lt', value: 0.1 },
        observation({
          system: { ...createEmptySystemMetrics(), generatedRps: 100, failedRps: 5 },
        }),
      ),
    ).toBe(true);

    expect(
      isConditionMet(
        { type: 'monthly-cost', op: 'lte', value: 200 },
        observation({ monthlyCostUsd: 180 }),
      ),
    ).toBe(true);
  });
});

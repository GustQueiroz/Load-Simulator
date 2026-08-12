import { describe, expect, it } from 'vitest';

import {
  EMPTY_HOLD,
  evaluateLesson,
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
    for (const lesson of LESSONS) {
      const snapshot = lesson.build(VOCABULARY);
      expect(snapshot.nodes.length).toBeGreaterThan(0);
      if (lesson.id !== '3.4') {
        expect(snapshot.edges.length).toBeGreaterThan(0);
      }
    }
  });

  /**
   * Node resolution only guesses when a kind is unambiguous, so a condition
   * pointing at an id the lesson never creates would silently never fire.
   * This keeps that class of typo out of the catalogue.
   */
  it.each(LESSONS.map((lesson) => lesson.id))(
    'lesson %s only references nodes it builds',
    (id) => {
      const lesson = lessonById(id)!;
      const built = new Set(lesson.build(VOCABULARY).nodes.map((node) => node.id));

      for (const nodeId of referencedNodeIds(lesson)) {
        expect(built, `${id} references "${nodeId}"`).toContain(nodeId);
      }
    },
  );
});

const VOCABULARY = {
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

function conditionNodeIds(condition: WinCondition, found: string[] = []): string[] {
  switch (condition.type) {
    case 'and':
    case 'or':
      for (const child of condition.conditions) conditionNodeIds(child, found);
      break;
    case 'sustained':
      conditionNodeIds(condition.condition, found);
      break;
    case 'bottleneck':
    case 'node-status':
    case 'node-utilization':
    case 'node-metric':
    case 'config-number':
      found.push(condition.nodeId);
      break;
    default:
      break;
  }
  return found;
}

function referencedNodeIds(lesson: (typeof LESSONS)[number]): string[] {
  const ids = [
    ...conditionNodeIds(lesson.win),
    ...(lesson.stars?.two ? conditionNodeIds(lesson.stars.two) : []),
    ...(lesson.stars?.three ? conditionNodeIds(lesson.stars.three) : []),
  ];

  for (const balloon of lesson.balloons) {
    if (balloon.anchor.type === 'node' || balloon.anchor.type === 'field') {
      ids.push(balloon.anchor.nodeId);
    }
    if (balloon.advanceWhen) ids.push(...conditionNodeIds(balloon.advanceWhen));
  }

  if (lesson.focusNodeId) ids.push(lesson.focusNodeId);
  if (lesson.locks?.nodes) ids.push(...Object.keys(lesson.locks.nodes));

  return [...new Set(ids)];
}

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

    const first = evaluateWin(win, obs);
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

describe('sustained conditions', () => {
  const busy = (utilization: number) =>
    new Map([['server-1', { ...createEmptyMetrics(), utilization, status: 'critical' as const }]]);

  /**
   * Two timers in one tree used to reset each other forever, because a single
   * tracker was threaded through the children and `and` short-circuited.
   */
  it('holds several timers in the same tree at once', () => {
    const win: WinCondition = {
      type: 'and',
      conditions: [
        { type: 'sustained', seconds: 3, condition: { type: 'run-status', status: 'running' } },
        {
          type: 'sustained',
          seconds: 3,
          condition: { type: 'node-utilization', nodeId: 'server-1', op: 'gt', value: 1 },
        },
      ],
    };

    let hold = EMPTY_HOLD;
    let result = evaluateWin(win, observation({ elapsedSeconds: 0, nodeMetrics: busy(1.4) }), hold);
    expect(result.ok).toBe(false);
    expect(Object.keys(result.hold.since)).toHaveLength(2);

    hold = result.hold;
    result = evaluateWin(win, observation({ elapsedSeconds: 1.5, nodeMetrics: busy(1.4) }), hold);
    expect(result.ok).toBe(false);

    hold = result.hold;
    result = evaluateWin(win, observation({ elapsedSeconds: 3.2, nodeMetrics: busy(1.4) }), hold);
    expect(result.ok).toBe(true);
  });

  it('restarts a timer when its condition stops being true', () => {
    const win: WinCondition = {
      type: 'sustained',
      seconds: 3,
      condition: { type: 'node-utilization', nodeId: 'server-1', op: 'gt', value: 1 },
    };

    const started = evaluateWin(win, observation({ elapsedSeconds: 0, nodeMetrics: busy(1.4) }));
    const dropped = evaluateWin(
      win,
      observation({ elapsedSeconds: 1, nodeMetrics: busy(0.2) }),
      started.hold,
    );
    expect(dropped.hold.since).toEqual({});

    const again = evaluateWin(
      win,
      observation({ elapsedSeconds: 3.5, nodeMetrics: busy(1.4) }),
      dropped.hold,
    );
    expect(again.ok).toBe(false);
  });

  /** Star tiers accumulate on every tick, not only at the moment of victory. */
  it('grades a star tier that requires holding a condition', () => {
    const lesson = {
      ...lessonById('0.1')!,
      win: { type: 'flag', flag: 'started' } as WinCondition,
      stars: {
        three: {
          type: 'sustained',
          seconds: 3,
          condition: { type: 'node-utilization', nodeId: 'server-1', op: 'gt', value: 1 },
        } as WinCondition,
      },
    };

    const flags = { started: true, paused: false, sawQueueDepth: false };

    const first = evaluateLesson(
      lesson,
      observation({ elapsedSeconds: 0, flags, nodeMetrics: busy(1.4) }),
    );
    expect(first.won).toBe(true);
    expect(first.stars).toBe(1);

    const later = evaluateLesson(
      lesson,
      observation({ elapsedSeconds: 4, flags, nodeMetrics: busy(1.4) }),
      first.hold,
    );
    expect(later.stars).toBe(3);
  });
});

describe('node resolution', () => {
  const serverConfig = createDefaultConfig('server', 'Server');

  it('matches by id first', () => {
    const nodes = new Map([
      ['server-1', { kind: 'server' as const, config: serverConfig }],
      ['server-2', { kind: 'server' as const, config: serverConfig }],
    ]);
    const nodeMetrics = new Map([
      ['server-1', { ...createEmptyMetrics(), utilization: 1.5 }],
      ['server-2', { ...createEmptyMetrics(), utilization: 0.1 }],
    ]);

    expect(
      isConditionMet(
        { type: 'node-utilization', nodeId: 'server-1', op: 'gt', value: 1 },
        observation({ nodes, nodeMetrics }),
      ),
    ).toBe(true);
  });

  it('falls back to the only node of that kind when the id is gone', () => {
    const nodes = new Map([['server-9', { kind: 'server' as const, config: serverConfig }]]);
    const nodeMetrics = new Map([['server-9', { ...createEmptyMetrics(), utilization: 1.5 }]]);

    expect(
      isConditionMet(
        { type: 'node-utilization', nodeId: 'server-1', op: 'gt', value: 1 },
        observation({ nodes, nodeMetrics }),
      ),
    ).toBe(true);
  });

  /** Guessing "the first server" out of three would grade the wrong component. */
  it('refuses to guess when several nodes share the kind', () => {
    const nodes = new Map([
      ['server-a', { kind: 'server' as const, config: serverConfig }],
      ['server-b', { kind: 'server' as const, config: serverConfig }],
    ]);
    const nodeMetrics = new Map([
      ['server-a', { ...createEmptyMetrics(), utilization: 1.5 }],
      ['server-b', { ...createEmptyMetrics(), utilization: 0.1 }],
    ]);

    expect(
      isConditionMet(
        { type: 'node-utilization', nodeId: 'server-1', op: 'gt', value: 1 },
        observation({ nodes, nodeMetrics }),
      ),
    ).toBe(false);
  });
});

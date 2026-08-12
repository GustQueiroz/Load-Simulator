import { describe, expect, it } from 'vitest';

import { LESSON_IDS, lessonById, type LessonId } from '@/application/lessons';

import { describeFinalState, playLesson, type LessonSolution } from '../support/play-lesson';

/**
 * Every lesson, played to completion.
 *
 * The rest of the suite checks that a lesson is *well formed*; this checks it
 * is *winnable* — that there exists a set of moves, inside the locks it
 * imposes, that satisfies the goal it states. A lesson whose objective cannot
 * be reached is the worst defect this product can ship, and it is invisible to
 * every other kind of test.
 *
 * Each solution below is the intended lesson, written out.
 */
const SOLUTIONS: Record<LessonId, LessonSolution> = {
  // Press play, find the bottleneck, pause.
  '0.1': { seconds: 4, pauseAtEnd: true },

  // Push the client until the server holds above 80% for three seconds.
  '0.2': { patch: { 'client-1': { rps: 400 } }, seconds: 12 },

  // Saturate the server without dragging the database down with it.
  '1.1': {
    patch: {
      'client-1': { rps: 600 },
      'server-1': { capacityRps: 100 },
      'db-1': { capacityRps: 2_000 },
    },
    seconds: 6,
  },

  // Three healthy servers, and the database still the bottleneck.
  '1.2': { seconds: 8 },

  // Raise the hit rate until the database is comfortable.
  '1.3': { patch: { 'cache-1': { hitRate: 0.95 } }, seconds: 8 },

  // Rate-limit at the edge so the service behind it stays healthy.
  '1.4': {
    patch: { 'gateway-1': { rateLimitRps: 150 }, 'server-1': { capacityRps: 400 } },
    seconds: 8,
  },

  // Let the queue absorb the burst and keep the worker at its own pace.
  '1.5': {
    patch: { 'queue-1': { deliveryCapacityRps: 120 }, 'server-1': { capacityRps: 400 } },
    seconds: 14,
  },

  // The cache is on the canvas but not in the path. Put it there.
  '2.1': {
    disconnect: [
      ['server-1', 'db-1'],
      ['server-2', 'db-1'],
    ],
    connect: [
      ['server-1', 'cache-1'],
      ['server-2', 'cache-1'],
      ['cache-1', 'db-1'],
    ],
    patch: { 'cache-1': { hitRate: 0.95 } },
    seconds: 20,
  },

  // Scale the stateless tier until nothing is critical.
  '2.2': {
    patch: {
      'server-1': { instances: 8 },
      'server-2': { instances: 8 },
      'db-1': { capacityRps: 4_000 },
      'lb-1': { capacityRps: 20_000 },
    },
    seconds: 20,
  },

  // Put a queue in front of the worker so the burst does not become errors.
  '2.3': {
    add: [
      {
        id: 'queue-x',
        kind: 'messageQueue',
        config: { ingressCapacityRps: 100_000, deliveryCapacityRps: 90, maxBacklog: 5_000_000 },
      },
    ],
    disconnect: [['client-1', 'server-1']],
    connect: [
      ['client-1', 'queue-x'],
      ['queue-x', 'server-1'],
    ],
    patch: { 'server-1': { capacityRps: 400 }, 'db-1': { capacityRps: 2_000 } },
    seconds: 24,
  },

  // Shed at the edge, but not so hard that most requests never land.
  '2.4': {
    patch: {
      // Throttle hard enough to protect the service, gently enough that most
      // of the traffic still gets served.
      'gateway-1': { rateLimitRps: 1_400, capacityRps: 20_000 },
      'server-1': { capacityRps: 2_000 },
      'db-1': { capacityRps: 2_000 },
    },
    seconds: 20,
  },

  // A clicked source still has to land somewhere that can take it.
  '2.5': {
    patch: { 'server-1': { capacityRps: 2_000 }, 'db-1': { capacityRps: 4_000 } },
    seconds: 20,
  },

  // Enough capacity to serve most of it, cheap enough to stay in budget.
  '3.1': {
    patch: { 'server-1': { capacityRps: 600 }, 'db-1': { capacityRps: 500 } },
    seconds: 26,
  },

  // The database is frozen, so the only move is to stop calling it so much.
  '3.2': {
    add: [{ id: 'cache-x', kind: 'cache', config: { hitRate: 0.95, capacityRps: 100_000 } }],
    disconnect: [
      ['server-1', 'db-1'],
      ['server-2', 'db-1'],
    ],
    connect: [
      ['server-1', 'cache-x'],
      ['server-2', 'cache-x'],
      ['cache-x', 'db-1'],
    ],
    patch: { 'server-1': { capacityRps: 600 }, 'server-2': { capacityRps: 600 } },
    seconds: 20,
  },

  // Serve almost everything, stay under budget.
  '3.3': {
    // The budget is the whole lesson: four instances per server and 8k of
    // load-balancer headroom are being paid for and not used. Keep two servers
    // for redundancy, size everything to the real 500 rps, switch off the third.
    patch: {
      'lb-1': { capacityRps: 700 },
      'server-1': { capacityRps: 350, instances: 1 },
      'server-2': { capacityRps: 350, instances: 1 },
      'server-3': { enabled: false },
      'cache-1': { hitRate: 0.95, capacityRps: 700 },
      'db-1': { capacityRps: 40 },
    },
    seconds: 20,
  },

  // An empty canvas and a budget.
  '3.4': {
    add: [
      { id: 'server-x', kind: 'server', config: { capacityRps: 1_200 } },
      { id: 'cache-x', kind: 'cache', config: { hitRate: 0.9, capacityRps: 1_000 } },
      { id: 'db-x', kind: 'database', config: { capacityRps: 150 } },
    ],
    connect: [
      ['client-1', 'server-x'],
      ['server-x', 'cache-x'],
      ['cache-x', 'db-x'],
    ],
    seconds: 24,
  },
};

describe('every lesson can be completed', () => {
  it.each([...LESSON_IDS])('lesson %s', (id) => {
    const lesson = lessonById(id);
    expect(lesson, `lesson ${id} is missing`).toBeDefined();
    if (!lesson) return;

    const result = playLesson(lesson, SOLUTIONS[id]);

    expect(
      result.won,
      `lesson ${id} was never completed.\n  ${describeFinalState(result)}`,
    ).toBe(true);
  });

  it('has a solution written for every lesson', () => {
    expect(Object.keys(SOLUTIONS).sort()).toEqual([...LESSON_IDS].sort());
  });
});

/**
 * Three stars should be an achievement, not the default. If the plain solution
 * already maxes a lesson out, its tiers are not asking for anything.
 */
describe('star tiers ask for more than the win', () => {
  const graded = [...LESSON_IDS]
    .map((id) => ({ id, lesson: lessonById(id)! }))
    .filter(({ lesson }) => lesson.stars?.three);

  it('at least one lesson does not hand out three stars for the base solution', () => {
    const perfect = graded.filter(({ id, lesson }) => playLesson(lesson, SOLUTIONS[id]).stars === 3);
    expect(perfect.length).toBeLessThan(graded.length);
  });
});

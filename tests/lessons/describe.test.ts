import { describe, expect, it } from 'vitest';

import { describeCondition, LESSONS, type WinCondition } from '@/application/lessons';

const idLabel = (nodeId: string) => nodeId;

describe('describeCondition', () => {
  it('flattens `and` into a flat list of clauses', () => {
    const condition: WinCondition = {
      type: 'and',
      conditions: [
        { type: 'failure-ratio', op: 'lt', value: 0.05 },
        { type: 'monthly-cost', op: 'lte', value: 140 },
      ],
    };

    expect(describeCondition(condition, idLabel)).toEqual([
      { kind: 'failure-ratio', op: 'lt', value: 0.05 },
      { kind: 'monthly-cost', op: 'lte', value: 140 },
    ]);
  });

  it('keeps `sustained` as a wrapper around what has to hold', () => {
    const condition: WinCondition = {
      type: 'sustained',
      seconds: 5,
      condition: { type: 'no-status', status: 'critical' },
    };

    expect(describeCondition(condition, idLabel)).toEqual([
      { kind: 'sustained', seconds: 5, of: [{ kind: 'no-status', status: 'critical' }] },
    ]);
  });

  it('drops bookkeeping conditions the learner cannot act on', () => {
    expect(describeCondition({ type: 'flag', flag: 'started' }, idLabel)).toEqual([]);
    expect(describeCondition({ type: 'elapsed', op: 'gte', seconds: 8 }, idLabel)).toEqual([]);
  });

  it('resolves node ids through the label lookup', () => {
    const clauses = describeCondition(
      { type: 'node-utilization', nodeId: 'server-1', op: 'lt', value: 0.7 },
      (id) => (id === 'server-1' ? 'Servidor 1' : id),
    );

    expect(clauses).toEqual([
      { kind: 'node-utilization', nodeId: 'server-1', nodeLabel: 'Servidor 1', op: 'lt', value: 0.7 },
    ]);
  });
});

/**
 * The completion modal explains a star tier by describing it. A tier that
 * describes to nothing — or to "some condition" — would leave the learner
 * with the same question they started with.
 */
describe('every star tier can be explained', () => {
  const tiers = LESSONS.flatMap((lesson) => [
    { id: lesson.id, tier: 'two' as const, condition: lesson.stars?.two },
    { id: lesson.id, tier: 'three' as const, condition: lesson.stars?.three },
  ]).filter((entry) => entry.condition !== undefined);

  it.each(tiers)('lesson $id, $tier stars', ({ condition }) => {
    const clauses = describeCondition(condition, idLabel);
    expect(clauses.length).toBeGreaterThan(0);
    expect(clauses.every((clause) => clause.kind !== 'opaque')).toBe(true);
  });
});

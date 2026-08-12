import { describe, expect, it } from 'vitest';

import { percentileOfOutcomes } from '@/domain/simulation/traffic';

import { chain, makeEdge, makeNode } from '../support/graph-builder';
import { metricsOf, run } from '../support/run';

describe('percentile of outcomes', () => {
  it('lets an outcome above the tail share set the percentile', () => {
    expect(
      percentileOfOutcomes([
        { share: 0.9, latencyMs: 2 },
        { share: 0.1, latencyMs: 50 },
      ]),
    ).toBe(50);
  });

  it('ignores an outcome too rare to reach the tail', () => {
    expect(
      percentileOfOutcomes([
        { share: 0.99, latencyMs: 20 },
        { share: 0.01, latencyMs: 5_000 },
      ]),
    ).toBe(20);
  });

  it('returns the only outcome there is', () => {
    expect(percentileOfOutcomes([{ share: 1, latencyMs: 42 }])).toBe(42);
  });

  it('is zero with no traffic', () => {
    expect(percentileOfOutcomes([])).toBe(0);
  });
});

/**
 * The lesson the mean cannot teach: a cache can look fast on average and still
 * have the database sitting in its tail.
 */
describe('the average hides the tail', () => {
  const withHitRate = (hitRate: number) => {
    const nodes = [
      makeNode('client', 'client', { rps: 500 }),
      makeNode('cache', 'cache', { capacityRps: 50_000, hitRate, hitLatencyMs: 2 }),
      makeNode('db', 'database', { capacityRps: 5_000, baseLatencyMs: 60 }),
    ];
    return run(nodes, chain('client', 'cache', 'db'), { ticks: 5 });
  };

  it('puts the database in the p95 when one request in ten misses', () => {
    const client = metricsOf(withHitRate(0.9), 'client');

    // Nine out of ten answered from memory, so the mean stays low…
    expect(client.responseLatencyMs).toBeLessThan(20);
    // …but one in ten pays the database, and one in ten is the tail.
    expect(client.responseP95Ms).toBeGreaterThan(50);
  });

  it('keeps the database out of the p95 when misses are rare', () => {
    const client = metricsOf(withHitRate(0.99), 'client');

    expect(client.responseLatencyMs).toBeLessThan(5);
    expect(client.responseP95Ms).toBeLessThan(20);
  });

  it('reports a tail worse than the mean on a saturated server', () => {
    const frame = run(
      [
        makeNode('client', 'client', { rps: 95 }),
        makeNode('server', 'server', { capacityRps: 100, baseLatencyMs: 20 }),
      ],
      chain('client', 'server'),
      { ticks: 5 },
    );
    const server = metricsOf(frame, 'server');

    expect(server.localP95Ms).toBeGreaterThan(server.localLatencyMs);
  });

  it('adds up the tails when one component calls two dependencies', () => {
    const frame = run(
      [
        makeNode('client', 'client', { rps: 100 }),
        makeNode('server', 'server', { capacityRps: 5_000, fanout: 'broadcast' }),
        makeNode('cache', 'cache', { capacityRps: 50_000, hitRate: 1, hitLatencyMs: 5 }),
        makeNode('db', 'database', { capacityRps: 5_000, baseLatencyMs: 40 }),
      ],
      [makeEdge('client', 'server'), makeEdge('server', 'cache'), makeEdge('server', 'db')],
    );
    const server = metricsOf(frame, 'server');

    // Every request pays both, so the tail is at least the database's.
    expect(server.responseP95Ms).toBeGreaterThan(metricsOf(frame, 'db').localP95Ms);
  });

  it('surfaces a system-wide p95 alongside the mean', () => {
    const frame = withHitRate(0.9);
    expect(frame.system.approximateP95LatencyMs).toBeGreaterThan(
      frame.system.approximateEndToEndLatencyMs,
    );
  });
});

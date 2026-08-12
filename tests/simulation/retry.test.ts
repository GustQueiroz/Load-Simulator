import { describe, expect, it } from 'vitest';

import { retryMultiplier } from '@/application/simulation/simulators/client.simulator';

import { chain, makeNode } from '../support/graph-builder';
import { metricsOf, run } from '../support/run';

describe('retry multiplier', () => {
  it('adds nothing while nothing is failing', () => {
    expect(retryMultiplier(0, 3)).toBe(1);
  });

  it('adds nothing when retries are not allowed', () => {
    expect(retryMultiplier(0.5, 0)).toBe(1);
  });

  it('is a truncated geometric series', () => {
    // 1 + 0.5 + 0.25
    expect(retryMultiplier(0.5, 2)).toBeCloseTo(1.75, 5);
  });

  it('cannot run away, even at total failure', () => {
    expect(retryMultiplier(1, 3)).toBe(4);
  });
});

/**
 * The classic distributed-systems own goal: the thing meant to paper over a
 * failure is what turns it into an outage.
 */
describe('retry storm', () => {
  const overloaded = (retryEnabled: boolean) =>
    run(
      [
        makeNode('client', 'client', { rps: 300, retryEnabled, maxRetries: 3 }),
        makeNode('server', 'server', { capacityRps: 100 }),
      ],
      chain('client', 'server'),
      { ticks: 40 },
    );

  it('sends more than the configured load once the target starts failing', () => {
    const withRetries = metricsOf(overloaded(true), 'client');
    const without = metricsOf(overloaded(false), 'client');

    expect(without.retryRps).toBe(0);
    expect(withRetries.retryRps).toBeGreaterThan(0);
    expect(withRetries.processedRps).toBeGreaterThan(without.processedRps);
  });

  it('makes the overloaded component worse, not better', () => {
    const withRetries = metricsOf(overloaded(true), 'server');
    const without = metricsOf(overloaded(false), 'server');

    expect(withRetries.utilization).toBeGreaterThan(without.utilization);
    expect(withRetries.failedRps).toBeGreaterThan(without.failedRps);
  });

  it('stays quiet while the target is healthy', () => {
    const frame = run(
      [
        makeNode('client', 'client', { rps: 50, retryEnabled: true, maxRetries: 3 }),
        makeNode('server', 'server', { capacityRps: 1_000 }),
      ],
      chain('client', 'server'),
      { ticks: 20 },
    );

    expect(metricsOf(frame, 'client').retryRps).toBeCloseTo(0, 5);
    expect(metricsOf(frame, 'server').incomingRps).toBeCloseTo(50, 5);
  });

  /** A caller sees the whole path fail, not just the box it talks to. */
  it('reports failures from deeper in the path', () => {
    const frame = run(
      [
        makeNode('client', 'client', { rps: 100 }),
        makeNode('server', 'server', { capacityRps: 1_000 }),
        makeNode('db', 'database', { capacityRps: 20 }),
      ],
      chain('client', 'server', 'db'),
      { ticks: 20 },
    );

    expect(metricsOf(frame, 'server').pathFailureRate).toBeGreaterThan(0.5);
    expect(metricsOf(frame, 'server').failedRps).toBe(0);
  });
});

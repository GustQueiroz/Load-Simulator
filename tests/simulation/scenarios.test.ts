import { describe, expect, it } from 'vitest';

import { chain, makeEdge, makeNode } from '../support/graph-builder';
import { metricsOf, run } from '../support/run';

/**
 * The scenarios the tool exists to demonstrate. If one of these stops holding,
 * a live presentation tells the wrong story — they matter more than any single
 * component unit test.
 */
describe('scenario: load balancer basics', () => {
  const nodes = [
    makeNode('c1', 'client', { rps: 50 }),
    makeNode('c2', 'client', { rps: 50 }),
    makeNode('lb', 'loadBalancer', { capacityRps: 150 }),
    makeNode('s1', 'server', { capacityRps: 100 }),
    makeNode('s2', 'server', { capacityRps: 100 }),
    makeNode('s3', 'server', { capacityRps: 100 }),
    makeNode('db', 'database', { capacityRps: 50 }),
  ];
  const edges = [
    makeEdge('c1', 'lb'),
    makeEdge('c2', 'lb'),
    makeEdge('lb', 's1'),
    makeEdge('lb', 's2'),
    makeEdge('lb', 's3'),
    makeEdge('s1', 'db'),
    makeEdge('s2', 'db'),
    makeEdge('s3', 'db'),
  ];

  it('spreads the load over the servers and overwhelms the database', () => {
    const frame = run(nodes, edges, { ticks: 10 });

    expect(metricsOf(frame, 'lb').incomingRps).toBeCloseTo(100, 5);
    for (const id of ['s1', 's2', 's3']) {
      const server = metricsOf(frame, id);
      expect(server.incomingRps).toBeCloseTo(33.333, 2);
      expect(server.status).toBe('normal');
    }

    const db = metricsOf(frame, 'db');
    expect(db.incomingRps).toBeCloseTo(100, 2);
    expect(db.utilization).toBeCloseTo(2, 2);
    expect(db.status).toBe('critical');
    expect(frame.system.bottleneckNodeId).toBe('db');
  });

  it('points at the database, not at the servers, as the probable bottleneck', () => {
    const frame = run(nodes, edges, { ticks: 30 });

    expect(frame.system.bottleneckNodeId).toBe('db');
    expect(frame.system.failedRps).toBeGreaterThan(0);
    expect(frame.system.approximateEndToEndLatencyMs).toBeGreaterThan(100);
  });
});

describe('scenario: why a load balancer exists', () => {
  it('single server melts, three servers behind a balancer do not', () => {
    const single = run(
      [makeNode('c', 'client', { rps: 150 }), makeNode('s', 'server', { capacityRps: 100 })],
      chain('c', 's'),
      { ticks: 10 },
    );
    expect(metricsOf(single, 's').status).toBe('critical');
    expect(metricsOf(single, 's').utilization).toBeCloseTo(1.5, 5);

    const balanced = run(
      [
        makeNode('c', 'client', { rps: 150 }),
        makeNode('lb', 'loadBalancer'),
        makeNode('s1', 'server', { capacityRps: 100 }),
        makeNode('s2', 'server', { capacityRps: 100 }),
        makeNode('s3', 'server', { capacityRps: 100 }),
      ],
      [
        makeEdge('c', 'lb'),
        makeEdge('lb', 's1'),
        makeEdge('lb', 's2'),
        makeEdge('lb', 's3'),
      ],
      { ticks: 10 },
    );

    for (const id of ['s1', 's2', 's3']) {
      expect(metricsOf(balanced, id).utilization).toBeCloseTo(0.5, 5);
      expect(metricsOf(balanced, id).status).toBe('normal');
    }
  });
});

describe('scenario: a slow dependency limits everything behind it', () => {
  it('never lets the database receive more than the server can process', () => {
    const nodes = [
      makeNode('c', 'client', { rps: 150 }),
      makeNode('s', 'server', { capacityRps: 100 }),
      makeNode('db', 'database', { capacityRps: 200 }),
    ];
    const frame = run(nodes, chain('c', 's', 'db'), { ticks: 10 });

    expect(metricsOf(frame, 's').status).toBe('critical');
    expect(metricsOf(frame, 'db').incomingRps).toBeLessThanOrEqual(100.0001);
    expect(metricsOf(frame, 's').queueDepth).toBeGreaterThan(0);
  });
});

describe('scenario: cache relieves the database', () => {
  it('cuts downstream load to roughly the miss rate', () => {
    const withoutCache = run(
      [
        makeNode('c', 'client', { rps: 1_000 }),
        makeNode('s', 'server', { capacityRps: 1_000 }),
        makeNode('db', 'database', { capacityRps: 200 }),
      ],
      chain('c', 's', 'db'),
      { ticks: 10 },
    );
    expect(metricsOf(withoutCache, 'db').status).toBe('critical');

    const withCache = run(
      [
        makeNode('c', 'client', { rps: 1_000 }),
        makeNode('s', 'server', { capacityRps: 1_000 }),
        makeNode('cache', 'cache', { hitRate: 0.9 }),
        makeNode('db', 'database', { capacityRps: 200 }),
      ],
      chain('c', 's', 'cache', 'db'),
      { ticks: 10 },
    );

    const db = metricsOf(withCache, 'db');
    expect(db.incomingRps).toBeLessThan(120);
    expect(db.status).toBe('normal');
  });
});

describe('scenario: queue absorbs a burst', () => {
  it('keeps the worker at its own pace while the backlog grows', () => {
    const nodes = [
      makeNode('producer', 'client', { rps: 1_000 }),
      makeNode('queue', 'messageQueue', { deliveryCapacityRps: 200 }),
      makeNode('worker', 'server', { capacityRps: 250 }),
    ];
    const frame = run(nodes, chain('producer', 'queue', 'worker'), { ticks: 100 });

    const queue = metricsOf(frame, 'queue');
    const worker = metricsOf(frame, 'worker');

    expect(queue.queueDepth).toBeCloseTo(8_000, -2);
    // The worker keeps working at its own pace instead of being crushed.
    expect(worker.incomingRps).toBeCloseTo(200, 5);
    expect(worker.utilization).toBeCloseTo(0.8, 5);
    expect(worker.queueDepth).toBe(0);
    // The producer is never blocked: it only waits for the publish ack.
    expect(metricsOf(frame, 'producer').responseLatencyMs).toBeLessThan(50);
  });
});

describe('scenario: rate limiting protects the service', () => {
  it('keeps the backend healthy while shedding the excess at the edge', () => {
    const unprotected = run(
      [
        makeNode('c', 'client', { rps: 5_000 }),
        makeNode('s', 'server', { capacityRps: 1_500 }),
      ],
      chain('c', 's'),
      { ticks: 10 },
    );
    expect(metricsOf(unprotected, 's').status).toBe('critical');

    const protectedRun = run(
      [
        makeNode('c', 'client', { rps: 5_000 }),
        makeNode('gw', 'apiGateway', { rateLimitRps: 1_000, capacityRps: 10_000 }),
        makeNode('s', 'server', { capacityRps: 1_500 }),
      ],
      chain('c', 'gw', 's'),
      { ticks: 10 },
    );

    const gateway = metricsOf(protectedRun, 'gw');
    const server = metricsOf(protectedRun, 's');

    expect(gateway.throttledRps).toBeCloseTo(4_000, 5);
    expect(server.incomingRps).toBeCloseTo(1_000, 5);
    expect(server.status).toBe('warning');
  });
});

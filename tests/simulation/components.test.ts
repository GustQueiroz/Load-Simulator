import { describe, expect, it } from 'vitest';

import { SimulationEngine } from '@/application/simulation/engine';

import { chain, makeEdge, makeNode } from '../support/graph-builder';
import { edgeRps, metricsOf, run } from '../support/run';

describe('server', () => {
  it('processes everything it receives below capacity', () => {
    const nodes = [
      makeNode('client', 'client', { rps: 80 }),
      makeNode('server', 'server', { capacityRps: 100 }),
    ];
    const frame = run(nodes, chain('client', 'server'));
    const server = metricsOf(frame, 'server');

    expect(server.incomingRps).toBeCloseTo(80, 5);
    expect(server.processedRps).toBeCloseTo(80, 5);
    expect(server.utilization).toBeCloseTo(0.8, 5);

    expect(server.status).toBe('critical');
    expect(server.queueDepth).toBe(0);
  });

  it('maps utilization to the documented status bands', () => {
    const statusAt = (rps: number) =>
      metricsOf(
        run(
          [makeNode('client', 'client', { rps }), makeNode('server', 'server', { capacityRps: 100 })],
          chain('client', 'server'),
        ),
        'server',
      ).status;

    expect(statusAt(0)).toBe('idle');
    expect(statusAt(59)).toBe('normal');
    expect(statusAt(60)).toBe('warning');
    expect(statusAt(79)).toBe('warning');
    expect(statusAt(80)).toBe('critical');
  });

  it('goes critical, caps throughput and builds a backlog when overloaded', () => {
    const nodes = [
      makeNode('client', 'client', { rps: 150 }),
      makeNode('server', 'server', { capacityRps: 100 }),
    ];
    const frame = run(nodes, chain('client', 'server'), { ticks: 5 });
    const server = metricsOf(frame, 'server');

    expect(server.utilization).toBeCloseTo(1.5, 5);
    expect(server.status).toBe('critical');
    expect(server.processedRps).toBeLessThanOrEqual(100.0001);
    expect(server.queueDepth).toBeGreaterThan(0);
    expect(server.failedRps).toBeGreaterThan(0);
    expect(server.localLatencyMs).toBeGreaterThan(25);
  });

  it('keeps the backlog within what the timeout allows', () => {
    const nodes = [
      makeNode('client', 'client', { rps: 1_000 }),
      makeNode('server', 'server', { capacityRps: 100, timeoutMs: 2_000, maxQueueSize: 10_000 }),
    ];
    const frame = run(nodes, chain('client', 'server'), { ticks: 200 });
    const server = metricsOf(frame, 'server');

    expect(server.queueDepth).toBeCloseTo(200, 5);
    expect(server.timedOutRps).toBeGreaterThan(0);
  });

  it('multiplies capacity by the number of instances', () => {
    const nodes = [
      makeNode('client', 'client', { rps: 300 }),
      makeNode('server', 'server', { capacityRps: 100, instances: 3 }),
    ];
    const frame = run(nodes, chain('client', 'server'));

    expect(metricsOf(frame, 'server').utilization).toBeCloseTo(1, 5);
  });

  it('fails from capacity alone when injected failure rate is zero', () => {
    const nodes = [
      makeNode('client', 'client', { rps: 5_000, baseFailureRate: 0 }),
      makeNode('server', 'server', { capacityRps: 100, baseFailureRate: 0 }),
      makeNode('database', 'database', { capacityRps: 100, baseFailureRate: 0 }),
    ];
    const frame = run(nodes, chain('client', 'server', 'database'), { ticks: 50 });
    const server = metricsOf(frame, 'server');

    expect(server.failedRps).toBeGreaterThan(4_000);
    expect(frame.system.failedRps).toBeGreaterThan(4_000);
    expect(frame.system.completedRps).toBeLessThan(100);

    expect(server.outgoingRps).toBeLessThan(server.processedRps);
  });
});

describe('load balancer', () => {
  it('splits traffic evenly with round robin', () => {
    const nodes = [
      makeNode('client', 'client', { rps: 150 }),
      makeNode('lb', 'loadBalancer', { capacityRps: 5_000 }),
      makeNode('s1', 'server'),
      makeNode('s2', 'server'),
      makeNode('s3', 'server'),
    ];
    const edges = [
      makeEdge('client', 'lb'),
      makeEdge('lb', 's1'),
      makeEdge('lb', 's2'),
      makeEdge('lb', 's3'),
    ];
    const frame = run(nodes, edges);

    for (const id of ['s1', 's2', 's3']) {
      expect(metricsOf(frame, id).incomingRps).toBeCloseTo(50, 5);
    }
  });

  it('honours configured weights', () => {
    const nodes = [
      makeNode('client', 'client', { rps: 300 }),
      makeNode('lb', 'loadBalancer', {
        algorithm: 'weightedRoundRobin',
        weights: { a: 1, b: 2 },
      }),
      makeNode('a', 'server', { capacityRps: 1_000 }),
      makeNode('b', 'server', { capacityRps: 1_000 }),
    ];
    const edges = [makeEdge('client', 'lb'), makeEdge('lb', 'a'), makeEdge('lb', 'b')];
    const frame = run(nodes, edges);

    expect(metricsOf(frame, 'a').incomingRps).toBeCloseTo(100, 5);
    expect(metricsOf(frame, 'b').incomingRps).toBeCloseTo(200, 5);
  });

  it('skips disabled targets', () => {
    const nodes = [
      makeNode('client', 'client', { rps: 100 }),
      makeNode('lb', 'loadBalancer'),
      makeNode('a', 'server', { capacityRps: 1_000 }),
      makeNode('b', 'server', { capacityRps: 1_000, enabled: false }),
    ];
    const edges = [makeEdge('client', 'lb'), makeEdge('lb', 'a'), makeEdge('lb', 'b')];
    const frame = run(nodes, edges);

    expect(metricsOf(frame, 'a').incomingRps).toBeCloseTo(100, 5);
    expect(metricsOf(frame, 'b').incomingRps).toBe(0);
  });

  it('drops everything when no target is connected', () => {
    const nodes = [makeNode('client', 'client', { rps: 100 }), makeNode('lb', 'loadBalancer')];
    const frame = run(nodes, chain('client', 'lb'));
    const lb = metricsOf(frame, 'lb');

    expect(lb.droppedRps).toBeCloseTo(100, 5);
    expect(lb.failedRps).toBeCloseTo(100, 5);
    expect(lb.outgoingRps).toBe(0);
  });

  it('drops the excess when its own capacity is exceeded', () => {
    const nodes = [
      makeNode('client', 'client', { rps: 500 }),
      makeNode('lb', 'loadBalancer', { capacityRps: 200 }),
      makeNode('s1', 'server', { capacityRps: 1_000 }),
    ];
    const edges = [makeEdge('client', 'lb'), makeEdge('lb', 's1')];
    const frame = run(nodes, edges);
    const lb = metricsOf(frame, 'lb');

    expect(lb.utilization).toBeCloseTo(2.5, 5);
    expect(lb.droppedRps).toBeCloseTo(300, 5);
    expect(lb.failedRps).toBeGreaterThanOrEqual(300);
    expect(lb.status).toBe('critical');
  });

  it('sends more traffic to the least loaded target', () => {
    const nodes = [
      makeNode('client', 'client', { rps: 200 }),
      makeNode('lb', 'loadBalancer', { algorithm: 'leastLoad' }),
      makeNode('small', 'server', { capacityRps: 50 }),
      makeNode('big', 'server', { capacityRps: 5_000 }),
    ];
    const edges = [makeEdge('client', 'lb'), makeEdge('lb', 'small'), makeEdge('lb', 'big')];
    const frame = run(nodes, edges, { ticks: 20 });

    expect(edgeRps(frame, 'lb', 'big')).toBeGreaterThan(edgeRps(frame, 'lb', 'small'));
  });
});

describe('cache', () => {
  it('only forwards misses downstream', () => {
    const nodes = [
      makeNode('client', 'client', { rps: 1_000 }),
      makeNode('cache', 'cache', { hitRate: 0.9, capacityRps: 10_000 }),
      makeNode('db', 'database', { capacityRps: 1_000 }),
    ];
    const frame = run(nodes, chain('client', 'cache', 'db'));
    const cache = metricsOf(frame, 'cache');

    expect(cache.hitsRps).toBeCloseTo(900, 5);
    expect(cache.missesRps).toBeCloseTo(100, 5);
    expect(metricsOf(frame, 'db').incomingRps).toBeCloseTo(100, 5);
  });

  it('sheds load above its own capacity', () => {
    const nodes = [
      makeNode('client', 'client', { rps: 2_000 }),
      makeNode('cache', 'cache', { capacityRps: 1_000, hitRate: 1 }),
    ];
    const frame = run(nodes, chain('client', 'cache'));
    const cache = metricsOf(frame, 'cache');

    expect(cache.droppedRps).toBeCloseTo(1_000, 5);
    expect(cache.failedRps).toBeGreaterThanOrEqual(1_000);
  });
});

describe('message queue', () => {
  it('accumulates a backlog when consumers cannot keep up', () => {
    const nodes = [
      makeNode('producer', 'client', { rps: 1_000 }),
      makeNode('queue', 'messageQueue', { deliveryCapacityRps: 700 }),
      makeNode('worker', 'server', { capacityRps: 1_000 }),
    ];

    const frame = run(nodes, chain('producer', 'queue', 'worker'), { ticks: 100 });
    const queue = metricsOf(frame, 'queue');

    expect(queue.queueDepth).toBeCloseTo(3_000, 0);
    expect(queue.outgoingRps).toBeCloseTo(700, 5);
  });

  it('reports a drain estimate once the burst is over', () => {
    const burst = [
      makeNode('producer', 'client', { rps: 1_000 }),
      makeNode('queue', 'messageQueue', { deliveryCapacityRps: 200 }),
    ];
    const quiet = [
      makeNode('producer', 'client', { rps: 0 }),
      makeNode('queue', 'messageQueue', { deliveryCapacityRps: 200 }),
    ];

    const engine = new SimulationEngine({ tickMs: 100 });
    for (let index = 0; index < 50; index += 1) engine.tick(burst, chain('producer', 'queue'));
    const frame = engine.tick(quiet, chain('producer', 'queue'));
    const queue = metricsOf(frame, 'queue');

    expect(queue.queueDepth).toBeGreaterThan(3_000);
    expect(queue.drainSeconds).toBeGreaterThan(0);
  });

  it('shares messages between competing consumers instead of duplicating them', () => {
    const nodes = [
      makeNode('producer', 'client', { rps: 200 }),
      makeNode('queue', 'messageQueue', { deliveryCapacityRps: 200 }),
      makeNode('w1', 'server', { capacityRps: 1_000 }),
      makeNode('w2', 'server', { capacityRps: 1_000 }),
    ];
    const edges = [
      makeEdge('producer', 'queue'),
      makeEdge('queue', 'w1'),
      makeEdge('queue', 'w2'),
    ];
    const frame = run(nodes, edges, { ticks: 5 });

    expect(metricsOf(frame, 'w1').incomingRps).toBeCloseTo(100, 5);
    expect(metricsOf(frame, 'w2').incomingRps).toBeCloseTo(100, 5);
  });
});

describe('api gateway', () => {
  it('throttles everything above the rate limit', () => {
    const nodes = [
      makeNode('client', 'client', { rps: 5_000 }),
      makeNode('gateway', 'apiGateway', { rateLimitRps: 3_000, capacityRps: 5_000 }),
      makeNode('server', 'server', { capacityRps: 10_000 }),
    ];
    const frame = run(nodes, chain('client', 'gateway', 'server'));
    const gateway = metricsOf(frame, 'gateway');

    expect(gateway.processedRps).toBeCloseTo(3_000, 5);
    expect(gateway.throttledRps).toBeCloseTo(2_000, 5);
    expect(metricsOf(frame, 'server').incomingRps).toBeCloseTo(3_000, 5);
  });

  it('adds authentication latency when enabled', () => {
    const base = [
      makeNode('client', 'client', { rps: 100 }),
      makeNode('gateway', 'apiGateway', { authEnabled: false }),
    ];
    const withAuth = [
      makeNode('client', 'client', { rps: 100 }),
      makeNode('gateway', 'apiGateway', { authEnabled: true, authLatencyMs: 12 }),
    ];

    const plain = metricsOf(run(base, chain('client', 'gateway')), 'gateway');
    const authed = metricsOf(run(withAuth, chain('client', 'gateway')), 'gateway');

    expect(authed.localLatencyMs - plain.localLatencyMs).toBeCloseTo(12, 5);
  });
});

describe('database', () => {
  it('treats a small connection pool as a capacity ceiling', () => {
    const nodes = [
      makeNode('client', 'client', { rps: 200 }),
      makeNode('db', 'database', { capacityRps: 1_000, baseLatencyMs: 50, maxConnections: 5 }),
    ];
    const frame = run(nodes, chain('client', 'db'));
    const db = metricsOf(frame, 'db');

    expect(db.processedRps).toBeCloseTo(100, 5);
    expect(db.status).toBe('critical');
    expect(db.connectionUtilization).toBeGreaterThan(0.9);
  });
});

describe('client', () => {
  it('sums traffic from several sources into one destination', () => {
    const nodes = [
      makeNode('c1', 'client', { rps: 50 }),
      makeNode('c2', 'client', { rps: 100 }),
      makeNode('lb', 'loadBalancer'),
      makeNode('s', 'server', { capacityRps: 1_000 }),
    ];
    const edges = [makeEdge('c1', 'lb'), makeEdge('c2', 'lb'), makeEdge('lb', 's')];
    const frame = run(nodes, edges);

    expect(metricsOf(frame, 'lb').incomingRps).toBeCloseTo(150, 5);
  });

  it('never sends requests it failed to create', () => {
    const nodes = [
      makeNode('client', 'client', { rps: 100, baseFailureRate: 0.1 }),
      makeNode('server', 'server', { capacityRps: 1_000 }),
    ];
    const frame = run(nodes, chain('client', 'server'));

    expect(metricsOf(frame, 'client').failedRps).toBeCloseTo(10, 5);
    expect(metricsOf(frame, 'server').incomingRps).toBeCloseTo(90, 5);
  });
});

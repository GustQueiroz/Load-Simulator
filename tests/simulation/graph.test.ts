import { describe, expect, it } from 'vitest';

import { SimulationEngine } from '@/application/simulation/engine';
import { validateConnection } from '@/domain/simulation/connection-rules';
import { buildSimulationGraph, wouldCreateCycle } from '@/domain/simulation/graph';

import { chain, makeEdge, makeNode } from '../support/graph-builder';
import { metricsOf, run } from '../support/run';

describe('graph construction', () => {
  it('orders nodes topologically', () => {
    const nodes = [makeNode('db', 'database'), makeNode('c', 'client'), makeNode('s', 'server')];
    const result = buildSimulationGraph(nodes, chain('c', 's', 'db'));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.graph.topologicalOrder).toEqual(['c', 's', 'db']);
    expect(result.graph.sourceIds).toEqual(['c']);
  });

  it('rejects cycles instead of looping forever', () => {
    const nodes = [makeNode('a', 'server'), makeNode('b', 'server')];
    const result = buildSimulationGraph(nodes, [makeEdge('a', 'b'), makeEdge('b', 'a')]);

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.cycleNodeIds.sort()).toEqual(['a', 'b']);
  });

  it('ignores edges pointing at deleted nodes', () => {
    const nodes = [makeNode('c', 'client'), makeNode('s', 'server')];
    const result = buildSimulationGraph(nodes, [makeEdge('c', 's'), makeEdge('s', 'ghost')]);

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.graph.edges).toHaveLength(1);
  });

  it('detects an indirect cycle before it is created', () => {
    const edges = [makeEdge('a', 'b'), makeEdge('b', 'c')];
    expect(wouldCreateCycle(edges, 'c', 'a')).toBe(true);
    expect(wouldCreateCycle(edges, 'a', 'c')).toBe(false);
  });
});

describe('connection rules', () => {
  const nodes = [makeNode('c', 'client'), makeNode('s', 'server'), makeNode('db', 'database')];
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const edges = [makeEdge('c', 's')];

  it('accepts a valid connection', () => {
    const result = validateConnection({
      candidate: { source: 's', target: 'db' },
      nodesById,
      edges,
    });
    expect(result.valid).toBe(true);
  });

  it.each([
    ['self connection', { source: 's', target: 's' }],
    ['duplicate', { source: 'c', target: 's' }],
    ['inbound into a client', { source: 's', target: 'c' }],
  ])('rejects %s', (_label, candidate) => {
    const result = validateConnection({ candidate, nodesById, edges });
    expect(result.valid).toBe(false);
  });
});

describe('engine lifecycle', () => {
  it('redistributes immediately when a server is added mid-run', () => {
    const engine = new SimulationEngine({ tickMs: 100 });
    const client = makeNode('c', 'client', { rps: 150 });
    const lb = makeNode('lb', 'loadBalancer');
    const s1 = makeNode('s1', 'server', { capacityRps: 100 });
    const s2 = makeNode('s2', 'server', { capacityRps: 100 });
    const s3 = makeNode('s3', 'server', { capacityRps: 100 });

    const twoServers = [client, lb, s1, s2];
    const twoEdges = [makeEdge('c', 'lb'), makeEdge('lb', 's1'), makeEdge('lb', 's2')];
    let frame = engine.tick(twoServers, twoEdges);
    expect(metricsOf(frame, 's1').incomingRps).toBeCloseTo(75, 5);

    frame = engine.tick([...twoServers, s3], [...twoEdges, makeEdge('lb', 's3')]);
    expect(metricsOf(frame, 's1').incomingRps).toBeCloseTo(50, 5);
  });

  it('picks up a configuration change on the very next tick', () => {
    const engine = new SimulationEngine({ tickMs: 100 });
    const edges = chain('c', 's');
    const server = makeNode('s', 'server', { capacityRps: 1_000 });

    const slow = engine.tick([makeNode('c', 'client', { rps: 100 }), server], edges);
    expect(metricsOf(slow, 's').incomingRps).toBeCloseTo(100, 5);

    const fast = engine.tick([makeNode('c', 'client', { rps: 900 }), server], edges);
    expect(metricsOf(fast, 's').incomingRps).toBeCloseTo(900, 5);
  });

  it('reset clears the backlog but keeps the configuration', () => {
    const engine = new SimulationEngine({ tickMs: 100 });
    const nodes = [
      makeNode('c', 'client', { rps: 1_000 }),
      makeNode('s', 'server', { capacityRps: 100 }),
    ];
    const edges = chain('c', 's');

    for (let index = 0; index < 20; index += 1) engine.tick(nodes, edges);
    expect(metricsOf(engine.tick(nodes, edges), 's').queueDepth).toBeGreaterThan(0);

    engine.reset();
    const frame = engine.tick(nodes, edges);

    expect(frame.tick).toBe(1);
    expect(metricsOf(frame, 's').queueDepth).toBeCloseTo(90, 5);
    expect(nodes[1].config.label).toBe('s');
  });

  it('produces the same numbers for the same diagram (determinism)', () => {
    const nodes = [
      makeNode('c', 'client', { rps: 500 }),
      makeNode('lb', 'loadBalancer', { algorithm: 'random' }),
      makeNode('s1', 'server'),
      makeNode('s2', 'server'),
    ];
    const edges = [makeEdge('c', 'lb'), makeEdge('lb', 's1'), makeEdge('lb', 's2')];

    const first = run(nodes, edges, { ticks: 25 });
    const second = run(nodes, edges, { ticks: 25 });

    expect(metricsOf(first, 's1').incomingRps).toBe(metricsOf(second, 's1').incomingRps);
    expect(metricsOf(first, 's2').incomingRps).toBe(metricsOf(second, 's2').incomingRps);
  });

  it('a disabled node answers nothing and drops what reaches it', () => {
    const nodes = [
      makeNode('c', 'client', { rps: 100 }),
      makeNode('s', 'server', { enabled: false }),
    ];
    const frame = run(nodes, chain('c', 's'));
    const server = metricsOf(frame, 's');

    expect(server.processedRps).toBe(0);
    expect(server.droppedRps).toBeCloseTo(100, 5);
    expect(server.failedRps).toBeCloseTo(100, 5);
  });
});

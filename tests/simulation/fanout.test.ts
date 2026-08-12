import { describe, expect, it } from 'vitest';

import { makeEdge, makeNode } from '../support/graph-builder';
import { metricsOf, run } from '../support/run';

/**
 * An edge means "calls". A component with two dependencies calls both by
 * default — which is the single most common surprise in the model, so it is
 * now a knob rather than a rule the reader has to know.
 */
describe('fan-out', () => {
  const diagram = (fanout: 'broadcast' | 'split') => ({
    nodes: [
      makeNode('client', 'client', { rps: 100 }),
      makeNode('server', 'server', { capacityRps: 1_000, fanout }),
      makeNode('cache', 'cache', { capacityRps: 10_000, hitRate: 1 }),
      makeNode('db', 'database', { capacityRps: 1_000 }),
    ],
    edges: [makeEdge('client', 'server'), makeEdge('server', 'cache'), makeEdge('server', 'db')],
  });

  it('broadcast calls every dependency once per request', () => {
    const { nodes, edges } = diagram('broadcast');
    const frame = run(nodes, edges);

    expect(metricsOf(frame, 'cache').incomingRps).toBeCloseTo(100, 5);
    expect(metricsOf(frame, 'db').incomingRps).toBeCloseTo(100, 5);
  });

  it('split shares the flow between them', () => {
    const { nodes, edges } = diagram('split');
    const frame = run(nodes, edges);

    expect(metricsOf(frame, 'cache').incomingRps).toBeCloseTo(50, 5);
    expect(metricsOf(frame, 'db').incomingRps).toBeCloseTo(50, 5);
  });

  it('makes no difference with a single dependency', () => {
    for (const fanout of ['broadcast', 'split'] as const) {
      const frame = run(
        [
          makeNode('client', 'client', { rps: 100 }),
          makeNode('server', 'server', { capacityRps: 1_000, fanout }),
          makeNode('db', 'database', { capacityRps: 1_000 }),
        ],
        [makeEdge('client', 'server'), makeEdge('server', 'db')],
      );
      expect(metricsOf(frame, 'db').incomingRps).toBeCloseTo(100, 5);
    }
  });
});

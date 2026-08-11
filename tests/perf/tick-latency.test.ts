import { describe, expect, it } from 'vitest';

import { SimulationEngine } from '@/application/simulation/engine';
import { createDefaultConfig } from '@/domain/nodes/defaults';
import type { SimulationEdge, SimulationNode } from '@/domain/simulation/graph';

import { measureMs, percentile, PERF_BUDGETS } from './budgets';

function classroomGraph(): { nodes: SimulationNode[]; edges: SimulationEdge[] } {
  const nodes: SimulationNode[] = [
    {
      id: 'client',
      kind: 'client',
      config: { ...createDefaultConfig('client', 'C'), rps: 800 },
    },
    {
      id: 'lb',
      kind: 'loadBalancer',
      config: createDefaultConfig('loadBalancer', 'LB'),
    },
    {
      id: 'api',
      kind: 'apiGateway',
      config: createDefaultConfig('apiGateway', 'GW'),
    },
    {
      id: 's1',
      kind: 'server',
      config: { ...createDefaultConfig('server', 'S1'), capacityRps: 200, instances: 2 },
    },
    {
      id: 's2',
      kind: 'server',
      config: { ...createDefaultConfig('server', 'S2'), capacityRps: 200, instances: 2 },
    },
    {
      id: 'cache',
      kind: 'cache',
      config: createDefaultConfig('cache', 'Cache'),
    },
    {
      id: 'db',
      kind: 'database',
      config: createDefaultConfig('database', 'DB'),
    },
    {
      id: 'q',
      kind: 'messageQueue',
      config: createDefaultConfig('messageQueue', 'Q'),
    },
  ];

  const edges: SimulationEdge[] = [
    { id: 'c-lb', source: 'client', target: 'lb', enabled: true },
    { id: 'lb-api', source: 'lb', target: 'api', enabled: true },
    { id: 'api-s1', source: 'api', target: 's1', enabled: true },
    { id: 'api-s2', source: 'api', target: 's2', enabled: true },
    { id: 's1-cache', source: 's1', target: 'cache', enabled: true },
    { id: 's2-cache', source: 's2', target: 'cache', enabled: true },
    { id: 'cache-db', source: 'cache', target: 'db', enabled: true },
    { id: 's1-q', source: 's1', target: 'q', enabled: true },
  ];

  return { nodes, edges };
}

function stressGraph(serverCount: number): { nodes: SimulationNode[]; edges: SimulationEdge[] } {
  const nodes: SimulationNode[] = [
    {
      id: 'client',
      kind: 'client',
      config: { ...createDefaultConfig('client', 'C'), rps: 5_000 },
    },
    {
      id: 'lb',
      kind: 'loadBalancer',
      config: { ...createDefaultConfig('loadBalancer', 'LB'), capacityRps: 50_000 },
    },
  ];
  const edges: SimulationEdge[] = [
    { id: 'c-lb', source: 'client', target: 'lb', enabled: true },
  ];

  for (let i = 0; i < serverCount; i += 1) {
    const id = `s${i}`;
    nodes.push({
      id,
      kind: 'server',
      config: { ...createDefaultConfig('server', id), capacityRps: 120, instances: 1 },
    });
    edges.push({ id: `lb-${id}`, source: 'lb', target: id, enabled: true });
  }

  return { nodes, edges };
}

describe('simulation tick latency', () => {
  it('keeps classroom graphs well under the 100ms tick budget', () => {
    const { nodes, edges } = classroomGraph();
    const engine = new SimulationEngine({ tickMs: 100 });
    const samples = measureMs(80, () => {
      engine.tick(nodes, edges);
    });
    const p95 = percentile(samples, 95);
    expect(p95).toBeLessThan(PERF_BUDGETS.tickP95MsClassroom);
  });

  it('keeps a 40-server fan-out under the stress budget', () => {
    const { nodes, edges } = stressGraph(40);
    const engine = new SimulationEngine({ tickMs: 100 });
    const samples = measureMs(40, () => {
      engine.tick(nodes, edges);
    });
    const p95 = percentile(samples, 95);
    expect(p95).toBeLessThan(PERF_BUDGETS.tickP95MsStress);
  });
});

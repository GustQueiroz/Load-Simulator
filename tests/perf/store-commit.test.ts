/** @vitest-environment jsdom */
import { describe, expect, it } from 'vitest';

import { SimulationEngine } from '@/application/simulation/engine';
import { createDefaultConfig } from '@/domain/nodes/defaults';
import type { DiagramNode } from '@/domain/diagram/diagram';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';

import { measureMs, percentile, PERF_BUDGETS } from './budgets';

function buildDiagram(serverCount: number): DiagramNode[] {
  const nodes: DiagramNode[] = [
    {
      id: 'client',
      type: 'client',
      position: { x: 0, y: 0 },
      data: {
        kind: 'client',
        config: { ...createDefaultConfig('client', 'C'), rps: 1_000 },
      },
    },
    {
      id: 'lb',
      type: 'loadBalancer',
      position: { x: 200, y: 0 },
      data: { kind: 'loadBalancer', config: createDefaultConfig('loadBalancer', 'LB') },
    },
  ];

  for (let i = 0; i < serverCount; i += 1) {
    const id = `s${i}`;
    nodes.push({
      id,
      type: 'server',
      position: { x: 400, y: i * 40 },
      data: {
        kind: 'server',
        config: { ...createDefaultConfig('server', id), capacityRps: 100 },
      },
    });
  }

  return nodes;
}

describe('store commitFrame cost', () => {
  it('commits a large frame under the UI commit budget', () => {
    const nodes = buildDiagram(30);
    const edges = nodes
      .filter((node) => node.id.startsWith('s'))
      .map((node) => ({
        id: `lb-${node.id}`,
        source: 'lb',
        target: node.id,
        data: { enabled: true },
      }));
    edges.unshift({ id: 'c-lb', source: 'client', target: 'lb', data: { enabled: true } });

    useSimulatorStore.setState({
      nodes,
      edges,
      past: [],
      future: [],
      status: 'stopped',
    });

    const engine = new SimulationEngine({ tickMs: 100 });
    const samples = measureMs(50, () => {
      const state = useSimulatorStore.getState();
      const frame = engine.tick(
        state.nodes.map((node) => ({ id: node.id, ...node.data })),
        state.edges.map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          enabled: edge.data?.enabled ?? true,
        })),
      );
      state.commitFrame(frame);
    });

    const p95 = percentile(samples, 95);
    expect(p95).toBeLessThan(PERF_BUDGETS.commitFrameP95Ms);
  });
});

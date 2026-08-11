import { createDefaultConfig } from '@/domain/nodes/defaults';
import type { NodeConfigByKind } from '@/domain/nodes/config';
import type { SimulationEdge, SimulationNode } from '@/domain/simulation/graph';
import type { NodeKind } from '@/domain/simulation/node-kind';

export function makeNode<K extends NodeKind>(
  id: string,
  kind: K,
  overrides: Partial<NodeConfigByKind[K]> = {},
): SimulationNode {
  const config = { ...createDefaultConfig(kind, id), ...overrides } as NodeConfigByKind[K];
  return { id, kind, config } as SimulationNode;
}

export function makeEdge(source: string, target: string): SimulationEdge {
  return { id: `${source}->${target}`, source, target, enabled: true };
}

export function chain(...ids: string[]): SimulationEdge[] {
  const edges: SimulationEdge[] = [];
  for (let index = 0; index < ids.length - 1; index += 1) {
    edges.push(makeEdge(ids[index], ids[index + 1]));
  }
  return edges;
}

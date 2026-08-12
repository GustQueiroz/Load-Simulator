import type { NodeConfigByKind } from '@/domain/nodes/config';
import { createDefaultConfig } from '@/domain/nodes/defaults';
import type { DiagramEdge, DiagramNode } from '@/domain/diagram/diagram';
import type { NodeKind } from '@/domain/simulation/node-kind';

// Row slots and card geometry are shared with the presets so both are
// compacted by the same rules — see `domain/diagram/layout`.
export { COL, col, ROWS, stackRows } from '@/domain/diagram/layout';

export function lessonNode<K extends NodeKind>(
  id: string,
  kind: K,
  x: number,
  y: number,
  label: string,
  overrides: Partial<NodeConfigByKind[K]> = {},
): DiagramNode {
  const config = { ...createDefaultConfig(kind, label), ...overrides } as NodeConfigByKind[K];
  return { id, type: kind, position: { x, y }, data: { kind, config } as DiagramNode['data'] };
}

export function lessonEdge(source: string, target: string): DiagramEdge {
  return { id: `e-${source}-${target}`, source, target, data: { enabled: true } };
}

import type { NodeConfigByKind } from '@/domain/nodes/config';
import { createDefaultConfig } from '@/domain/nodes/defaults';
import type { DiagramEdge, DiagramNode } from '@/domain/diagram/diagram';
import type { NodeKind } from '@/domain/simulation/node-kind';

export const COL = 340;
export const ROWS = [0, 320, 760, 1_200, 1_640] as const;

export const col = (index: number) => index * COL;

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

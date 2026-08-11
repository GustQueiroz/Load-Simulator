import type { DiagramEdge, DiagramNode } from '@/domain/diagram/diagram';

export interface DiagramCheckpoint {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
}

export const MAX_DIAGRAM_HISTORY = 50;

export function cloneCheckpoint(
  nodes: readonly DiagramNode[],
  edges: readonly DiagramEdge[],
): DiagramCheckpoint {
  return {
    nodes: structuredClone(nodes) as DiagramNode[],
    edges: structuredClone(edges) as DiagramEdge[],
  };
}

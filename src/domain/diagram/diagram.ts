import type { SimulatorNodeData } from '../nodes/config';
import type { SimulationEdge, SimulationNode } from '../simulation/graph';
import type { NodeKind } from '../simulation/node-kind';

export interface DiagramPosition {
  x: number;
  y: number;
}

export interface DiagramNode {
  id: string;
  type: NodeKind;
  position: DiagramPosition;
  data: SimulatorNodeData;
  selected?: boolean;
  dragging?: boolean;
  width?: number;
  height?: number;
  measured?: { width?: number; height?: number };
}

export interface DiagramEdgeData extends Record<string, unknown> {
  enabled: boolean;
}

export interface DiagramEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  type?: string;
  data?: DiagramEdgeData;
  selected?: boolean;
  animated?: boolean;
}

export interface DiagramViewport {
  x: number;
  y: number;
  zoom: number;
}

export interface DiagramSnapshot {
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  viewport?: DiagramViewport;
}

export const DEFAULT_VIEWPORT: DiagramViewport = { x: 0, y: 0, zoom: 1 };

export function toSimulationNodes(nodes: readonly DiagramNode[]): SimulationNode[] {
  return nodes.map((node) => ({ id: node.id, ...node.data }));
}

export function toSimulationEdges(edges: readonly DiagramEdge[]): SimulationEdge[] {
  return edges.map((edge) => ({
    id: edge.id,
    source: edge.source,
    target: edge.target,
    sourceHandle: edge.sourceHandle,
    targetHandle: edge.targetHandle,
    enabled: edge.data?.enabled ?? true,
  }));
}

export function nextLabelFor(
  nodes: readonly DiagramNode[],
  kind: NodeKind,
  prefix: string,
): string {
  const pattern = new RegExp(`^${escapeRegExp(prefix)} (\\d+)$`);

  let highest = 0;
  for (const node of nodes) {
    if (node.data.kind !== kind) continue;
    const match = pattern.exec(node.data.config.label);
    if (match) highest = Math.max(highest, Number(match[1]));
  }

  return `${prefix} ${highest + 1}`;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

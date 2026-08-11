import type { SimulatorNodeData } from '../nodes/config';
import type { SimulationEdge, SimulationNode } from '../simulation/graph';
import type { NodeKind } from '../simulation/node-kind';

export interface DiagramPosition {
  x: number;
  y: number;
}

/**
 * A node as the *diagram* knows it: identity, layout and data.
 *
 * Deliberately shaped like a React Flow node (and structurally compatible with
 * one) without importing it — the editor library stays a detail of the
 * presentation layer.
 */
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

/** Projection consumed by the engine: layout and selection are dropped. */
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

/**
 * Next display name for a kind: "Server 1", "Server 2", ...
 *
 * The localized prefix is passed in — a label is *data* (it is persisted and
 * the user can rename it), so the domain numbers it without knowing the
 * language it is written in.
 *
 * Numbers are never reused: deleting "Server 2" does not make the next one
 * take its place, which keeps a live demo from renaming itself under the
 * audience's eyes.
 */
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

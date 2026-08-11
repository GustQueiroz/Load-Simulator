import type { NodeConfigByKind } from '../nodes/config';
import type { NodeKind } from './node-kind';

/** A node as the engine sees it: identity, kind and configuration. No layout. */
export type SimulationNode = {
  [K in NodeKind]: { id: string; kind: K; config: NodeConfigByKind[K] };
}[NodeKind];

export interface SimulationEdge {
  id: string;
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
  enabled: boolean;
}

export interface SimulationGraph {
  readonly nodes: readonly SimulationNode[];
  readonly edges: readonly SimulationEdge[];
  readonly nodesById: ReadonlyMap<string, SimulationNode>;
  readonly outgoing: ReadonlyMap<string, readonly SimulationEdge[]>;
  readonly incoming: ReadonlyMap<string, readonly SimulationEdge[]>;
  /** Guaranteed to contain every node exactly once (the graph is acyclic). */
  readonly topologicalOrder: readonly string[];
  /** Nodes with no inbound edges — traffic starts here. */
  readonly sourceIds: readonly string[];
}

export type GraphBuildResult =
  | { ok: true; graph: SimulationGraph }
  | { ok: false; reason: 'cycle'; cycleNodeIds: string[] };

const NO_EDGES: readonly SimulationEdge[] = Object.freeze([]);

/**
 * Builds the runtime view of the diagram.
 *
 * Synchronous cycles are intentionally rejected in V1: with a DAG the whole
 * frame can be computed in one deterministic pass (topological order), which
 * is what makes the simulation reproducible during a live presentation.
 */
export function buildSimulationGraph(
  nodes: readonly SimulationNode[],
  edges: readonly SimulationEdge[],
): GraphBuildResult {
  const nodesById = new Map<string, SimulationNode>();
  for (const node of nodes) nodesById.set(node.id, node);

  const outgoing = new Map<string, SimulationEdge[]>();
  const incoming = new Map<string, SimulationEdge[]>();

  // Stale edges (pointing at deleted nodes) and disabled edges are dropped
  // here so no later stage has to remember to skip them.
  const liveEdges = edges.filter(
    (edge) => edge.enabled && nodesById.has(edge.source) && nodesById.has(edge.target),
  );

  for (const edge of liveEdges) {
    pushInto(outgoing, edge.source, edge);
    pushInto(incoming, edge.target, edge);
  }

  const order = topologicalOrder(nodes, outgoing);
  if (!order) {
    return { ok: false, reason: 'cycle', cycleNodeIds: findNodesInCycles(nodes, outgoing) };
  }

  const sourceIds = nodes
    .filter((node) => (incoming.get(node.id)?.length ?? 0) === 0)
    .map((node) => node.id);

  return {
    ok: true,
    graph: { nodes, edges: liveEdges, nodesById, outgoing, incoming, topologicalOrder: order, sourceIds },
  };
}

/**
 * Same topology, fresh node objects.
 *
 * Editing a slider replaces a node without changing the structure, so a
 * cached ordering stays valid — but the engine must always read the *current*
 * configuration, never the snapshot taken when the topology last changed.
 */
export function rebindNodes(
  graph: SimulationGraph,
  nodes: readonly SimulationNode[],
): SimulationGraph {
  const nodesById = new Map<string, SimulationNode>();
  for (const node of nodes) nodesById.set(node.id, node);
  return { ...graph, nodes, nodesById };
}

export function outgoingEdgesOf(graph: SimulationGraph, nodeId: string): readonly SimulationEdge[] {
  return graph.outgoing.get(nodeId) ?? NO_EDGES;
}

function pushInto(map: Map<string, SimulationEdge[]>, key: string, edge: SimulationEdge): void {
  const list = map.get(key);
  if (list) list.push(edge);
  else map.set(key, [edge]);
}

/**
 * Kahn's algorithm. Node insertion order is preserved among ready nodes, so
 * the same diagram always yields the same order (determinism matters here).
 */
function topologicalOrder(
  nodes: readonly SimulationNode[],
  outgoing: ReadonlyMap<string, readonly SimulationEdge[]>,
): string[] | null {
  const inDegree = new Map<string, number>();
  for (const node of nodes) inDegree.set(node.id, 0);
  for (const node of nodes) {
    for (const edge of outgoing.get(node.id) ?? NO_EDGES) {
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }
  }

  const ready = nodes.filter((node) => inDegree.get(node.id) === 0).map((node) => node.id);
  const order: string[] = [];

  while (ready.length > 0) {
    const id = ready.shift() as string;
    order.push(id);
    for (const edge of outgoing.get(id) ?? NO_EDGES) {
      const next = (inDegree.get(edge.target) ?? 0) - 1;
      inDegree.set(edge.target, next);
      if (next === 0) ready.push(edge.target);
    }
  }

  return order.length === nodes.length ? order : null;
}

/** Nodes that still have unresolved dependencies after Kahn's pass. */
function findNodesInCycles(
  nodes: readonly SimulationNode[],
  outgoing: ReadonlyMap<string, readonly SimulationEdge[]>,
): string[] {
  const resolved = new Set(topologicalPrefix(nodes, outgoing));
  return nodes.filter((node) => !resolved.has(node.id)).map((node) => node.id);
}

function topologicalPrefix(
  nodes: readonly SimulationNode[],
  outgoing: ReadonlyMap<string, readonly SimulationEdge[]>,
): string[] {
  const inDegree = new Map<string, number>();
  for (const node of nodes) inDegree.set(node.id, 0);
  for (const node of nodes) {
    for (const edge of outgoing.get(node.id) ?? NO_EDGES) {
      inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
    }
  }
  const ready = nodes.filter((node) => inDegree.get(node.id) === 0).map((node) => node.id);
  const done: string[] = [];
  while (ready.length > 0) {
    const id = ready.shift() as string;
    done.push(id);
    for (const edge of outgoing.get(id) ?? NO_EDGES) {
      const next = (inDegree.get(edge.target) ?? 0) - 1;
      inDegree.set(edge.target, next);
      if (next === 0) ready.push(edge.target);
    }
  }
  return done;
}

/** True when adding `source -> target` would close a loop (target reaches source). */
export function wouldCreateCycle(
  edges: readonly SimulationEdge[],
  source: string,
  target: string,
): boolean {
  if (source === target) return true;

  const adjacency = new Map<string, string[]>();
  for (const edge of edges) {
    if (!edge.enabled) continue;
    const list = adjacency.get(edge.source);
    if (list) list.push(edge.target);
    else adjacency.set(edge.source, [edge.target]);
  }

  const seen = new Set<string>([target]);
  const stack = [target];
  while (stack.length > 0) {
    const current = stack.pop() as string;
    if (current === source) return true;
    for (const next of adjacency.get(current) ?? []) {
      if (seen.has(next)) continue;
      seen.add(next);
      stack.push(next);
    }
  }
  return false;
}

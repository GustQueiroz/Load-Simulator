import type { SimulationEdge, SimulationNode } from './graph';
import { wouldCreateCycle } from './graph';
import { isTrafficSource } from './node-kind';

export interface ConnectionCandidate {
  source: string;
  target: string;
  sourceHandle?: string | null;
  targetHandle?: string | null;
}

export interface ConnectionContext {
  candidate: ConnectionCandidate;
  nodesById: ReadonlyMap<string, SimulationNode>;
  edges: readonly SimulationEdge[];
}

export type ConnectionRejection =
  | 'unknown-endpoint'
  | 'self-loop'
  | 'duplicate'
  | 'client-inbound'
  | 'cycle';

export type ConnectionValidation = { valid: true } | { valid: false; reason: ConnectionRejection };

export type ConnectionRule = (context: ConnectionContext) => ConnectionRejection | null;

const knownEndpoints: ConnectionRule = ({ candidate, nodesById }) =>
  nodesById.has(candidate.source) && nodesById.has(candidate.target) ? null : 'unknown-endpoint';

const noSelfLoop: ConnectionRule = ({ candidate }) =>
  candidate.source === candidate.target ? 'self-loop' : null;

const noDuplicate: ConnectionRule = ({ candidate, edges }) =>
  edges.some((edge) => edge.source === candidate.source && edge.target === candidate.target)
    ? 'duplicate'
    : null;

const sourcesAreSources: ConnectionRule = ({ candidate, nodesById }) => {
  const target = nodesById.get(candidate.target);
  return target && isTrafficSource(target.kind) ? 'client-inbound' : null;
};

const noCycles: ConnectionRule = ({ candidate, edges }) =>
  wouldCreateCycle(edges, candidate.source, candidate.target) ? 'cycle' : null;

export const CONNECTION_RULES: readonly ConnectionRule[] = [
  knownEndpoints,
  noSelfLoop,
  noDuplicate,
  sourcesAreSources,
  noCycles,
];

export function validateConnection(context: ConnectionContext): ConnectionValidation {
  for (const rule of CONNECTION_RULES) {
    const reason = rule(context);
    if (reason) return { valid: false, reason };
  }
  return { valid: true };
}

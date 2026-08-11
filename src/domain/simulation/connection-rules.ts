import type { SimulationEdge, SimulationNode } from './graph';
import { wouldCreateCycle } from './graph';

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

/**
 * Why a connection was refused. A code, not a sentence: the domain states the
 * rule and the presentation layer decides how to say it, in which language.
 */
export type ConnectionRejection =
  | 'unknown-endpoint'
  | 'self-loop'
  | 'duplicate'
  | 'client-inbound'
  | 'cycle';

export type ConnectionValidation = { valid: true } | { valid: false; reason: ConnectionRejection };

/** A rule returns a rejection code, or `null` when it has nothing to say. */
export type ConnectionRule = (context: ConnectionContext) => ConnectionRejection | null;

const knownEndpoints: ConnectionRule = ({ candidate, nodesById }) =>
  nodesById.has(candidate.source) && nodesById.has(candidate.target) ? null : 'unknown-endpoint';

const noSelfLoop: ConnectionRule = ({ candidate }) =>
  candidate.source === candidate.target ? 'self-loop' : null;

const noDuplicate: ConnectionRule = ({ candidate, edges }) =>
  edges.some((edge) => edge.source === candidate.source && edge.target === candidate.target)
    ? 'duplicate'
    : null;

const clientsAreSources: ConnectionRule = ({ candidate, nodesById }) =>
  nodesById.get(candidate.target)?.kind === 'client' ? 'client-inbound' : null;

const noCycles: ConnectionRule = ({ candidate, edges }) =>
  wouldCreateCycle(edges, candidate.source, candidate.target) ? 'cycle' : null;

/**
 * Ordered so the most specific rejection wins. Extending the policy means
 * appending a rule here — no other file changes.
 */
export const CONNECTION_RULES: readonly ConnectionRule[] = [
  knownEndpoints,
  noSelfLoop,
  noDuplicate,
  clientsAreSources,
  noCycles,
];

export function validateConnection(context: ConnectionContext): ConnectionValidation {
  for (const rule of CONNECTION_RULES) {
    const reason = rule(context);
    if (reason) return { valid: false, reason };
  }
  return { valid: true };
}

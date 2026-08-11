import type { SimulationEdge } from '@/domain/simulation/graph';
import type { TrafficFlow } from '@/domain/simulation/traffic';

import { DEFAULT_PORT, type FlowOutput } from './types';

export interface RoutedFlow {
  edge: SimulationEdge;
  flow: TrafficFlow;
}

/**
 * Turns one simulator output into per-edge flows.
 *
 * `broadcast` sends the whole flow to every dependency (a request that hits a
 * cache *and* a database costs both). `split` shares it, optionally weighted
 * by target — that is how load balancing and competing consumers are
 * expressed without ever touching an individual request.
 */
export function routeOutput(
  output: FlowOutput,
  outgoingEdges: readonly SimulationEdge[],
): RoutedFlow[] {
  const port = output.port ?? DEFAULT_PORT;
  const edges = outgoingEdges.filter(
    (edge) => (edge.sourceHandle ?? DEFAULT_PORT) === port || output.port === undefined,
  );

  if (edges.length === 0 || output.rps <= 0) return [];

  if (output.routing.mode === 'broadcast') {
    return edges.map((edge) => ({
      edge,
      flow: { rps: output.rps, latencyMs: output.latencyMs, failureRate: output.failureRate },
    }));
  }

  const weights = output.routing.weights;
  const shares = edges.map((edge) => (weights ? Math.max(0, weights[edge.target] ?? 0) : 1));
  const totalWeight = shares.reduce((total, share) => total + share, 0);
  if (totalWeight <= 0) return [];

  return edges.map((edge, index) => ({
    edge,
    flow: {
      rps: (output.rps * shares[index]) / totalWeight,
      latencyMs: output.latencyMs,
      failureRate: output.failureRate,
    },
  }));
}

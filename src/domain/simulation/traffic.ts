/**
 * Traffic is modelled as a *fluid*: a rate plus the average properties of the
 * requests inside it. We never allocate an object per request — a flow of
 * 100k req/s costs exactly as much to simulate as a flow of 10 req/s.
 */
export interface TrafficFlow {
  /** Requests per second still alive on this path (failures are not forwarded). */
  rps: number;
  /** Average accumulated latency of those requests, in ms. */
  latencyMs: number;
  /** Share of the original demand that already failed upstream (0..1, informational). */
  failureRate: number;
}

/** What a simulator receives after all of its inbound edges are merged. */
export interface SimulationInput {
  incomingRps: number;
  weightedLatencyMs: number;
  inheritedFailureRate: number;
}

export const EMPTY_INPUT: SimulationInput = Object.freeze({
  incomingRps: 0,
  weightedLatencyMs: 0,
  inheritedFailureRate: 0,
});

/**
 * Merges several inbound flows into one input.
 *
 * Rates add up; latency and failure rate are averaged *weighted by volume*,
 * so a 10 req/s slow path does not distort a 1000 req/s fast path.
 */
export function aggregateFlows(flows: readonly TrafficFlow[]): SimulationInput {
  let totalRps = 0;
  let latencyProduct = 0;
  let failureProduct = 0;

  for (const flow of flows) {
    if (flow.rps <= 0) continue;
    totalRps += flow.rps;
    latencyProduct += flow.rps * flow.latencyMs;
    failureProduct += flow.rps * flow.failureRate;
  }

  if (totalRps <= 0) return EMPTY_INPUT;

  return {
    incomingRps: totalRps,
    weightedLatencyMs: latencyProduct / totalRps,
    inheritedFailureRate: failureProduct / totalRps,
  };
}

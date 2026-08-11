

export interface TrafficFlow {

  rps: number;

  latencyMs: number;

  failureRate: number;
}

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

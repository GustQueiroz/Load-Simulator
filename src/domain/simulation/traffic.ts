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
  /** Accumulated latency of the slow 5% — the number that pages people. */
  p95LatencyMs: number;
  /** Share of the original demand that already failed upstream (0..1, informational). */
  failureRate: number;
}

/** What a simulator receives after all of its inbound edges are merged. */
export interface SimulationInput {
  incomingRps: number;
  weightedLatencyMs: number;
  p95LatencyMs: number;
  inheritedFailureRate: number;
}

export const EMPTY_INPUT: SimulationInput = Object.freeze({
  incomingRps: 0,
  weightedLatencyMs: 0,
  p95LatencyMs: 0,
  inheritedFailureRate: 0,
});

/** Anything slower than this share of traffic defines the tail we report. */
export const TAIL_SHARE = 0.05;

export interface WeightedLatency {
  share: number;
  latencyMs: number;
}

/**
 * 95th percentile of a set of outcomes, each treated as a point mass.
 *
 * Sorted slowest first, we walk until 5% of the traffic is accounted for: the
 * outcome we land on *is* the p95. This is what makes the model able to say
 * "your average is 8 ms and your p95 is the database" — a 10% miss rate sets
 * the tail, a 1% one does not.
 *
 * Shares need not sum to 1; they are normalised.
 */
export function percentileOfOutcomes(outcomes: readonly WeightedLatency[], tail = TAIL_SHARE): number {
  const total = outcomes.reduce((sum, item) => sum + Math.max(0, item.share), 0);
  if (total <= 0) return 0;

  const sorted = [...outcomes]
    .filter((item) => item.share > 0)
    .sort((a, b) => b.latencyMs - a.latencyMs);

  let cumulative = 0;
  for (const outcome of sorted) {
    cumulative += outcome.share / total;
    if (cumulative >= tail) return outcome.latencyMs;
  }

  return sorted[sorted.length - 1]?.latencyMs ?? 0;
}

/**
 * Merges several inbound flows into one input.
 *
 * Rates add up; the mean is averaged *weighted by volume*, so a 10 req/s slow
 * path does not distort a 1000 req/s fast path. The tail is not averaged at
 * all — averaging percentiles is how a model ends up hiding the very thing the
 * percentile exists to show.
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
    p95LatencyMs: percentileOfOutcomes(
      flows.map((flow) => ({ share: flow.rps, latencyMs: flow.p95LatencyMs })),
    ),
    inheritedFailureRate: failureProduct / totalRps,
  };
}

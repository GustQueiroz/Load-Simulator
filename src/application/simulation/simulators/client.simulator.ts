import { clamp01 } from '@/lib/math';

import { routingFor, type SimulationContext, type SimulatorFor } from '../types';
import { effectiveClientRps } from '../models/load-profile';

/**
 * How much extra load a retry policy adds when a share `failure` of attempts
 * comes back an error.
 *
 * Each attempt that fails is tried again, and that attempt fails at the same
 * rate — a geometric series, truncated at `maxRetries`. At a 50% failure rate
 * with two retries the source is already sending 1.75× its configured load,
 * which is what turns a degradation into an outage: more load, more failures,
 * more retries.
 *
 * The failure rate comes from the *previous* tick, so the loop closes without
 * the graph needing a cycle.
 */
export function retryMultiplier(failure: number, maxRetries: number): number {
  const rate = clamp01(failure);
  let multiplier = 1;
  let attempt = rate;

  for (let index = 0; index < Math.max(0, Math.floor(maxRetries)); index += 1) {
    multiplier += attempt;
    attempt *= rate;
  }

  return multiplier;
}

/** Failure the destinations reported last tick, weighted by their capacity share. */
function observedFailure(context: SimulationContext): number {
  const healthy = context.targets.filter((target) => target.enabled);
  if (healthy.length === 0) return 0;

  const total = healthy.reduce((sum, target) => sum + target.previousPathFailureRate, 0);
  return clamp01(total / healthy.length);
}

export const clientSimulator: SimulatorFor<'client'> = {
  simulate(config, _runtime, _input, context) {
    const elapsedSeconds = context.nowMs / 1000;
    const requestedRps = effectiveClientRps(config, elapsedSeconds);

    const multiplier = config.retryEnabled
      ? retryMultiplier(observedFailure(context), config.maxRetries)
      : 1;
    const generatedRps = requestedRps * multiplier;
    const retryRps = generatedRps - requestedRps;

    const failureRate = clamp01(config.baseFailureRate);
    const failedRps = generatedRps * failureRate;
    const sentRps = generatedRps - failedRps;
    const localLatencyMs = Math.max(0, config.baseLatencyMs);

    return {
      metrics: {
        incomingRps: generatedRps,
        processedRps: generatedRps,
        outgoingRps: sentRps,
        failedRps,
        droppedRps: 0,
        retryRps,

        utilization: 0,
        status: sentRps > 0 ? 'normal' : 'idle',
        localLatencyMs,
        localP95Ms: localLatencyMs,
        totalLatencyMs: localLatencyMs,
      },
      outputs: [
        {
          rps: sentRps,
          latencyMs: localLatencyMs,
          p95LatencyMs: localLatencyMs,
          failureRate,
          routing: routingFor(config),
        },
      ],
    };
  },
};

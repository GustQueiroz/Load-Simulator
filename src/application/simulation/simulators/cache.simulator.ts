import { statusFromUtilization } from '@/domain/simulation/status';
import { clamp01, safeDivide } from '@/lib/math';

import { combineFailureRates, effectiveFailureRate, totalFailedRps } from '../models/failure';
import { capLatency, saturationMultiplier } from '../models/latency';
import { BROADCAST, type SimulatorFor } from '../types';

/**
 * Read-through cache.
 *
 * Only misses continue downstream — that single rule is the whole point of
 * the component and the reason a 90% hit rate turns 1.000 req/s into 100.
 *
 * The diagram only draws dependencies, so there is no return edge: a hit is
 * simply "resolved here" and the response path stays abstract.
 */
export const cacheSimulator: SimulatorFor<'cache'> = {
  simulate(config, _runtime, input) {
    const capacityRps = Math.max(0, config.capacityRps);
    const incomingRps = Math.max(0, input.incomingRps);

    const processedRps = Math.min(incomingRps, capacityRps);
    const droppedRps = incomingRps - processedRps;

    const hitRate = clamp01(config.hitRate);
    const hitsRps = processedRps * hitRate;
    const missesRps = processedRps - hitsRps;

    const utilization = safeDivide(incomingRps, capacityRps);
    const failureRate = effectiveFailureRate(config.baseFailureRate, utilization);
    const softFailedRps = processedRps * failureRate;
    const outgoingRps = missesRps * (1 - failureRate);

    const lookupLatencyMs =
      hitRate * Math.max(0, config.hitLatencyMs) +
      (1 - hitRate) * Math.max(0, config.missOverheadMs);
    const localLatencyMs =
      (Math.max(0, config.baseLatencyMs) + lookupLatencyMs) * saturationMultiplier(utilization);
    const totalLatencyMs = capLatency(input.weightedLatencyMs + localLatencyMs);

    return {
      metrics: {
        incomingRps,
        processedRps,
        outgoingRps,
        failedRps: totalFailedRps(softFailedRps, droppedRps),
        droppedRps,
        hitsRps,
        missesRps,
        utilization,
        status: statusFromUtilization(utilization),
        localLatencyMs,
        totalLatencyMs,
      },
      outputs: [
        {
          rps: outgoingRps,
          latencyMs: totalLatencyMs,
          failureRate: combineFailureRates(input.inheritedFailureRate, failureRate),
          routing: BROADCAST,
        },
      ],
    };
  },
};

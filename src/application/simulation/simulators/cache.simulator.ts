import { statusFromUtilization } from '@/domain/simulation/status';
import { percentileOfOutcomes } from '@/domain/simulation/traffic';
import { clamp01, safeDivide } from '@/lib/math';

import { combineFailureRates, effectiveFailureRate, totalFailedRps } from '../models/failure';
import { capLatency, saturationMultiplier } from '../models/latency';
import { routingFor, type SimulatorFor } from '../types';

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

    // A cache is two populations, not one average: hits answered here and
    // misses that pay the lookup and then go on. Once misses are more than 5%
    // of the traffic, they *are* the tail — which is the whole reason a p95
    // exists in this model.
    const saturation = saturationMultiplier(utilization);
    const base = Math.max(0, config.baseLatencyMs);
    const localP95Ms = percentileOfOutcomes([
      { share: hitRate, latencyMs: (base + Math.max(0, config.hitLatencyMs)) * saturation },
      { share: 1 - hitRate, latencyMs: (base + Math.max(0, config.missOverheadMs)) * saturation },
    ]);

    const totalLatencyMs = capLatency(input.weightedLatencyMs + localLatencyMs);
    const totalP95Ms = capLatency(input.p95LatencyMs + localP95Ms);

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
        localP95Ms: capLatency(localP95Ms),
        totalLatencyMs,
      },
      outputs: [
        {
          rps: outgoingRps,
          latencyMs: totalLatencyMs,
          p95LatencyMs: totalP95Ms,
          failureRate: combineFailureRates(input.inheritedFailureRate, failureRate),
          routing: routingFor(config),
        },
      ],
    };
  },
};

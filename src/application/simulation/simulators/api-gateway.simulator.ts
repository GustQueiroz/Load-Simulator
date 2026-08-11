import { statusFromUtilization } from '@/domain/simulation/status';
import { safeDivide } from '@/lib/math';

import { combineFailureRates, effectiveFailureRate, totalFailedRps } from '../models/failure';
import { capLatency, serviceLatencyMs } from '../models/latency';
import { BROADCAST, type SimulatorFor } from '../types';

/**
 * Single entry point: adds overhead, optionally authenticates, and protects
 * everything behind it with a rate limit.
 *
 * Note the two different utilizations. The badge shows the *pressure* the
 * gateway is under (incoming / capacity) — that is the number the audience
 * needs to see. Latency and overload errors are derived from the traffic it
 * actually accepted, because shedding a request is much cheaper than serving
 * it. That is what makes rate limiting protective instead of contagious.
 */
export const apiGatewaySimulator: SimulatorFor<'apiGateway'> = {
  simulate(config, _runtime, input) {
    const capacityRps = Math.max(0, config.capacityRps);
    const incomingRps = Math.max(0, input.incomingRps);
    const admissionLimitRps = Math.min(capacityRps, Math.max(0, config.rateLimitRps));

    const acceptedRps = Math.min(incomingRps, admissionLimitRps);
    const throttledRps = incomingRps - acceptedRps;

    const pressureUtilization = safeDivide(incomingRps, capacityRps);
    const serviceUtilization = safeDivide(acceptedRps, capacityRps);

    const failureRate = effectiveFailureRate(config.baseFailureRate, serviceUtilization);
    const softFailedRps = acceptedRps * failureRate;
    const outgoingRps = acceptedRps - softFailedRps;

    const authLatencyMs = config.authEnabled ? Math.max(0, config.authLatencyMs) : 0;
    const localLatencyMs = serviceLatencyMs(config.baseLatencyMs, serviceUtilization) + authLatencyMs;
    const totalLatencyMs = capLatency(input.weightedLatencyMs + localLatencyMs);

    return {
      metrics: {
        incomingRps,
        processedRps: acceptedRps,
        outgoingRps,
        // A 429 at the edge is a failure for the client, even with injected
        // failure rate at 0 — the gateway is protecting capacity behind it.
        failedRps: totalFailedRps(softFailedRps, throttledRps),
        droppedRps: throttledRps,
        throttledRps,
        utilization: pressureUtilization,
        status: statusFromUtilization(pressureUtilization),
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

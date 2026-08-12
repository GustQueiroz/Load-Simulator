import { statusFromUtilization } from '@/domain/simulation/status';
import { safeDivide } from '@/lib/math';

import { combineFailureRates, effectiveFailureRate, totalFailedRps } from '../models/failure';
import { capLatency, serviceLatencyMs, serviceTailLatencyMs } from '../models/latency';
import { routingFor, type SimulatorFor } from '../types';

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
    const localP95Ms = serviceTailLatencyMs(config.baseLatencyMs, serviceUtilization) + authLatencyMs;
    const totalLatencyMs = capLatency(input.weightedLatencyMs + localLatencyMs);
    const totalP95Ms = capLatency(input.p95LatencyMs + localP95Ms);

    return {
      metrics: {
        incomingRps,
        processedRps: acceptedRps,
        outgoingRps,

        failedRps: totalFailedRps(softFailedRps, throttledRps),
        droppedRps: throttledRps,
        throttledRps,
        utilization: pressureUtilization,
        status: statusFromUtilization(pressureUtilization),
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

import { statusFromUtilization } from '@/domain/simulation/status';
import { safeDivide } from '@/lib/math';

import { combineFailureRates, effectiveFailureRate, totalFailedRps } from '../models/failure';
import { capLatency, queueWaitMs } from '../models/latency';
import type { SimulatorFor } from '../types';

export const messageQueueSimulator: SimulatorFor<'messageQueue'> = {
  simulate(config, runtime, input, context) {
    const { dtSeconds } = context;
    const ingressCapacityRps = Math.max(0, config.ingressCapacityRps);
    const deliveryCapacityRps = Math.max(0, config.deliveryCapacityRps);
    const maxBacklog = Math.max(0, config.maxBacklog);
    const incomingRps = Math.max(0, input.incomingRps);

    const acceptedRps = Math.min(incomingRps, ingressCapacityRps);
    let rejectedRps = incomingRps - acceptedRps;

    let backlog = Math.max(0, runtime.backlogCount) + acceptedRps * dtSeconds;
    if (backlog > maxBacklog) {
      rejectedRps += safeDivide(backlog - maxBacklog, dtSeconds);
      backlog = maxBacklog;
    }

    const deliveredCount = Math.min(backlog, deliveryCapacityRps * dtSeconds);
    backlog -= deliveredCount;
    const deliveredRps = safeDivide(deliveredCount, dtSeconds);

    const consumerUtilization = safeDivide(incomingRps, deliveryCapacityRps);
    const backlogUtilization = safeDivide(backlog, maxBacklog);
    const utilization = Math.max(consumerUtilization, backlogUtilization);

    const failureRate = effectiveFailureRate(config.baseFailureRate, backlogUtilization);
    const softFailedRps = deliveredRps * failureRate;
    const outgoingRps = deliveredRps - softFailedRps;

    const waitMs = queueWaitMs(backlog, deliveryCapacityRps);
    const localLatencyMs = capLatency(Math.max(0, config.baseLatencyMs) + waitMs);
    const totalLatencyMs = capLatency(input.weightedLatencyMs + localLatencyMs);
    const totalP95Ms = capLatency(input.p95LatencyMs + localLatencyMs);

    const netDrainRps = deliveryCapacityRps - incomingRps;
    const drainSeconds = netDrainRps > 0 && backlog > 0 ? backlog / netDrainRps : undefined;

    return {
      metrics: {
        incomingRps,
        processedRps: deliveredRps,
        outgoingRps,
        failedRps: totalFailedRps(softFailedRps, rejectedRps),
        droppedRps: rejectedRps,
        queueDepth: backlog,
        utilization,
        status: statusFromUtilization(utilization),
        localLatencyMs,
        localP95Ms: localLatencyMs,
        totalLatencyMs,

        ackLatencyMs: Math.max(0, config.baseLatencyMs),
        drainSeconds,
      },
      outputs: [
        {
          rps: outgoingRps,
          latencyMs: totalLatencyMs,
          p95LatencyMs: totalP95Ms,
          failureRate: combineFailureRates(input.inheritedFailureRate, failureRate),

          routing: { mode: 'split' },
        },
      ],
      runtimePatch: { backlogCount: backlog },
    };
  },
};

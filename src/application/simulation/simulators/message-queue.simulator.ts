import { statusFromUtilization } from '@/domain/simulation/status';
import { safeDivide } from '@/lib/math';

import { combineFailureRates, effectiveFailureRate, totalFailedRps } from '../models/failure';
import { capLatency, queueWaitMs } from '../models/latency';
import type { SimulatorFor } from '../types';

/**
 * Decouples producer from consumer by keeping a backlog.
 *
 * The backlog is a **count of messages**, never a rate: accepted traffic is
 * converted to messages with `dt`, delivery drains messages, and the outgoing
 * rate is derived back from what was actually delivered this tick.
 */
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

    // Two independent pressures: consumers falling behind, and a queue that is
    // running out of room. The worst of them drives the badge.
    const consumerUtilization = safeDivide(incomingRps, deliveryCapacityRps);
    const backlogUtilization = safeDivide(backlog, maxBacklog);
    const utilization = Math.max(consumerUtilization, backlogUtilization);

    const failureRate = effectiveFailureRate(config.baseFailureRate, backlogUtilization);
    const softFailedRps = deliveredRps * failureRate;
    const outgoingRps = deliveredRps - softFailedRps;

    const waitMs = queueWaitMs(backlog, deliveryCapacityRps);
    const localLatencyMs = capLatency(Math.max(0, config.baseLatencyMs) + waitMs);
    const totalLatencyMs = capLatency(input.weightedLatencyMs + localLatencyMs);

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
        totalLatencyMs,
        // The producer only waits for the publish acknowledgement — that is
        // the whole point of putting a queue in the path.
        ackLatencyMs: Math.max(0, config.baseLatencyMs),
        drainSeconds,
      },
      outputs: [
        {
          rps: outgoingRps,
          latencyMs: totalLatencyMs,
          failureRate: combineFailureRates(input.inheritedFailureRate, failureRate),
          // Consumers compete for messages: each one gets a share, not a copy.
          routing: { mode: 'split' },
        },
      ],
      runtimePatch: { backlogCount: backlog },
    };
  },
};

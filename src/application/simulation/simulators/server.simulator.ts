import { statusFromUtilization } from '@/domain/simulation/status';

import { combineFailureRates, effectiveFailureRate, totalFailedRps } from '../models/failure';
import { capLatency, serviceLatencyMs } from '../models/latency';
import { stepWorkQueue } from '../models/work-queue';
import { BROADCAST, type SimulatorFor } from '../types';

/**
 * Synchronous application server: a bounded waiting line in front of a fixed
 * amount of service capacity, replicated over `instances`.
 *
 * There is no backpressure signal towards upstream in V1 — an overloaded
 * server queues, times out or sheds, but it never asks the client to slow
 * down. That simplification is intentional and is what makes the "retry
 * storm" and "queue absorbs the burst" demos readable.
 */
export const serverSimulator: SimulatorFor<'server'> = {
  simulate(config, runtime, input, context) {
    const instances = Math.max(1, Math.floor(config.instances));
    const capacityRps = Math.max(0, config.capacityRps) * instances;

    const queue = stepWorkQueue({
      incomingRps: input.incomingRps,
      capacityRps,
      backlogCount: runtime.backlogCount,
      maxQueueSize: Math.max(0, config.maxQueueSize),
      timeoutMs: Math.max(0, config.timeoutMs),
      dtSeconds: context.dtSeconds,
    });

    const failureRate = effectiveFailureRate(config.baseFailureRate, queue.utilization);
    const erroredRps = queue.processedRps * failureRate;
    const outgoingRps = queue.processedRps - erroredRps;
    // Timeouts and queue sheds are capacity failures — they happen with
    // baseFailureRate at 0 when demand exceeds what the server can hold.
    const capacityRejectedRps = queue.timedOutRps + queue.droppedRps;

    const localLatencyMs =
      serviceLatencyMs(config.baseLatencyMs, queue.utilization) + queue.queueWaitMs;
    const totalLatencyMs = capLatency(input.weightedLatencyMs + localLatencyMs);

    return {
      metrics: {
        incomingRps: input.incomingRps,
        processedRps: queue.processedRps,
        outgoingRps,
        failedRps: totalFailedRps(erroredRps, capacityRejectedRps),
        droppedRps: queue.droppedRps,
        timedOutRps: queue.timedOutRps,
        utilization: queue.utilization,
        status: statusFromUtilization(queue.utilization),
        localLatencyMs: capLatency(localLatencyMs),
        totalLatencyMs,
        queueDepth: queue.backlogCount,
        instances,
      },
      outputs: [
        {
          rps: outgoingRps,
          latencyMs: totalLatencyMs,
          failureRate: combineFailureRates(input.inheritedFailureRate, failureRate),
          routing: BROADCAST,
        },
      ],
      runtimePatch: { backlogCount: queue.backlogCount },
    };
  },
};

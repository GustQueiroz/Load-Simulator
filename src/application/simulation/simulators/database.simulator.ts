import { statusFromUtilization } from '@/domain/simulation/status';
import { safeDivide } from '@/lib/math';

import { combineFailureRates, effectiveFailureRate, totalFailedRps } from '../models/failure';
import { capLatency, serviceLatencyMs } from '../models/latency';
import { stepWorkQueue } from '../models/work-queue';
import { BROADCAST, type SimulatorFor } from '../types';

export const databaseSimulator: SimulatorFor<'database'> = {
  simulate(config, runtime, input, context) {
    const throughputCapacityRps = Math.max(0, config.capacityRps);
    const maxConnections = Math.max(1, config.maxConnections);

    const queryTimeSeconds = Math.max(0, config.baseLatencyMs) / 1000;
    const connectionCapacityRps =
      queryTimeSeconds > 0 ? maxConnections / queryTimeSeconds : Number.POSITIVE_INFINITY;

    const capacityRps = Math.min(throughputCapacityRps, connectionCapacityRps);

    const queue = stepWorkQueue({
      incomingRps: input.incomingRps,
      capacityRps,
      backlogCount: runtime.backlogCount,
      maxQueueSize: Math.max(0, config.maxQueueSize),
      timeoutMs: Math.max(0, config.timeoutMs),
      dtSeconds: context.dtSeconds,
    });

    const serviceMs = serviceLatencyMs(config.baseLatencyMs, queue.utilization);
    const concurrentConnections = queue.processedRps * (serviceMs / 1000);
    const connectionUtilization = safeDivide(concurrentConnections, maxConnections);

    const failureRate = effectiveFailureRate(config.baseFailureRate, queue.utilization);
    const erroredRps = queue.processedRps * failureRate;
    const outgoingRps = queue.processedRps - erroredRps;
    const capacityRejectedRps = queue.timedOutRps + queue.droppedRps;

    const localLatencyMs = serviceMs + queue.queueWaitMs;
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
        concurrentConnections,
        connectionUtilization,
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

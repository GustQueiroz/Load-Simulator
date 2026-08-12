import { statusFromUtilization } from '@/domain/simulation/status';

import { combineFailureRates, effectiveFailureRate, totalFailedRps } from '../models/failure';
import { capLatency, serviceLatencyMs, serviceTailLatencyMs } from '../models/latency';
import { stepWorkQueue } from '../models/work-queue';
import { routingFor, type SimulatorFor } from '../types';

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

    const capacityRejectedRps = queue.timedOutRps + queue.droppedRps;

    const localLatencyMs =
      serviceLatencyMs(config.baseLatencyMs, queue.utilization) + queue.queueWaitMs;
    // Queue wait is not multiplied: a request arriving behind a known backlog
    // waits about that long whether it is a typical request or a tail one.
    const localP95Ms =
      serviceTailLatencyMs(config.baseLatencyMs, queue.utilization) + queue.queueWaitMs;
    const totalLatencyMs = capLatency(input.weightedLatencyMs + localLatencyMs);
    const totalP95Ms = capLatency(input.p95LatencyMs + localP95Ms);

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
        localP95Ms: capLatency(localP95Ms),
        totalLatencyMs,
        queueDepth: queue.backlogCount,
        instances,
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
      runtimePatch: { backlogCount: queue.backlogCount },
    };
  },
};

import { safeDivide } from '@/lib/math';

import { queueWaitMs } from './latency';

export interface WorkQueueStep {
  incomingRps: number;
  capacityRps: number;

  backlogCount: number;
  maxQueueSize: number;
  timeoutMs: number;
  dtSeconds: number;
}

export interface WorkQueueResult {
  processedRps: number;

  backlogCount: number;

  droppedRps: number;

  timedOutRps: number;
  queueWaitMs: number;
  utilization: number;
}

export function stepWorkQueue(step: WorkQueueStep): WorkQueueResult {
  const { dtSeconds } = step;
  const capacityRps = Math.max(0, step.capacityRps);
  const incomingRps = Math.max(0, step.incomingRps);

  const arrivals = incomingRps * dtSeconds;
  const serviceCapacity = capacityRps * dtSeconds;

  const demand = Math.max(0, step.backlogCount) + arrivals;
  const processed = Math.min(demand, serviceCapacity);

  let backlog = demand - processed;
  let droppedCount = 0;
  let timedOutCount = 0;

  const backlogAllowedByTimeout = capacityRps * (Math.max(0, step.timeoutMs) / 1000);
  const admissionLimit = Math.max(0, step.maxQueueSize);
  const hardLimit = Math.min(admissionLimit, backlogAllowedByTimeout);

  if (backlog > hardLimit) {
    const overflow = backlog - hardLimit;
    backlog = hardLimit;

    if (backlogAllowedByTimeout <= admissionLimit) timedOutCount = overflow;
    else droppedCount = overflow;
  }

  return {
    processedRps: safeDivide(processed, dtSeconds),
    backlogCount: backlog,
    droppedRps: safeDivide(droppedCount, dtSeconds),
    timedOutRps: safeDivide(timedOutCount, dtSeconds),
    queueWaitMs: queueWaitMs(backlog, capacityRps),
    utilization: safeDivide(incomingRps, capacityRps),
  };
}

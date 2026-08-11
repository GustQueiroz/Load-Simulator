import { safeDivide } from '@/lib/math';

import { queueWaitMs } from './latency';

export interface WorkQueueStep {
  incomingRps: number;
  capacityRps: number;
  /** Backlog carried from the previous tick, in items. */
  backlogCount: number;
  maxQueueSize: number;
  timeoutMs: number;
  dtSeconds: number;
}

export interface WorkQueueResult {
  processedRps: number;
  /** Backlog after the tick, in items. */
  backlogCount: number;
  /** Load shed because the queue was full. */
  droppedRps: number;
  /** Requests that waited longer than the timeout and were abandoned. */
  timedOutRps: number;
  queueWaitMs: number;
  utilization: number;
}

/**
 * One tick of a synchronous component with a bounded waiting line
 * (application server, database). Shared so both behave identically.
 *
 * Two ceilings apply to the backlog:
 *  - `maxQueueSize`, an explicit admission limit (load shedding);
 *  - the depth that can still be served inside `timeoutMs` — anything beyond
 *    that would be answered too late anyway, so it expires.
 */
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
    // Attribute the loss to whichever ceiling actually bound first.
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

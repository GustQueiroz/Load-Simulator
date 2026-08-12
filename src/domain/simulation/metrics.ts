import type { LoadStatus } from './status';

export interface NodeMetrics {

  incomingRps: number;

  processedRps: number;

  outgoingRps: number;

  failedRps: number;

  droppedRps: number;

  utilization: number;

  localLatencyMs: number;

  totalLatencyMs: number;

  /**
   * Probability that a request entering here eventually fails somewhere on
   * its path — what a caller would observe, not just what this node broke.
   */
  pathFailureRate: number;

  /** Extra load this source is generating by re-sending failures. */
  retryRps?: number;

  /** Time inside this node for the slow 5%. */
  localP95Ms: number;

  responseLatencyMs: number;
  /** Same, for the slow 5% — the number an SLO is written against. */
  responseP95Ms: number;

  ackLatencyMs?: number;

  queueDepth: number;
  status: LoadStatus;
  lastUpdatedAt: number;

  hitsRps?: number;

  missesRps?: number;

  throttledRps?: number;

  timedOutRps?: number;

  instances?: number;

  connectionUtilization?: number;

  concurrentConnections?: number;

  drainSeconds?: number;

  cooldownRemainingMs?: number;

  pendingCount?: number;
}

export interface EdgeMetrics {
  rps: number;
  failureRate: number;
  avgLatencyMs: number;
  status: LoadStatus;
}

export interface SystemMetrics {

  generatedRps: number;

  completedRps: number;

  failedRps: number;

  droppedRps: number;

  bufferedRps: number;

  approximateEndToEndLatencyMs: number;
  /** What the slowest 5% of the traffic experiences end to end. */
  approximateP95LatencyMs: number;
  bottleneckNodeId?: string;
  worstStatus: LoadStatus;
}

export function createEmptyMetrics(now = 0): NodeMetrics {
  return {
    incomingRps: 0,
    processedRps: 0,
    outgoingRps: 0,
    failedRps: 0,
    droppedRps: 0,
    utilization: 0,
    localLatencyMs: 0,
    localP95Ms: 0,
    pathFailureRate: 0,
    totalLatencyMs: 0,
    responseLatencyMs: 0,
    responseP95Ms: 0,
    queueDepth: 0,
    status: 'idle',
    lastUpdatedAt: now,
  };
}

export function createEmptySystemMetrics(): SystemMetrics {
  return {
    generatedRps: 0,
    completedRps: 0,
    failedRps: 0,
    droppedRps: 0,
    bufferedRps: 0,
    approximateEndToEndLatencyMs: 0,
    approximateP95LatencyMs: 0,
    worstStatus: 'idle',
  };
}

export function createEmptyEdgeMetrics(): EdgeMetrics {
  return { rps: 0, failureRate: 0, avgLatencyMs: 0, status: 'idle' };
}

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

  responseLatencyMs: number;

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
    totalLatencyMs: 0,
    responseLatencyMs: 0,
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
    worstStatus: 'idle',
  };
}

export function createEmptyEdgeMetrics(): EdgeMetrics {
  return { rps: 0, failureRate: 0, avgLatencyMs: 0, status: 'idle' };
}

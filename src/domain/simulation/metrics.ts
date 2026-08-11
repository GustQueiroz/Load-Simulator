import type { LoadStatus } from './status';

/**
 * Result of one simulation tick for a single node.
 *
 * Rates are always "per second" (`*Rps`); anything named `*Count` is an
 * absolute amount of requests/messages sitting somewhere. Mixing the two is
 * the single most common bug in this kind of model, so the naming is strict.
 *
 * Kind-specific numbers (cache hits, gateway throttling, ...) are optional
 * fields instead of a loose `Record<string, number>` so renderers stay typed.
 */
export interface NodeMetrics {
  /** Demand arriving at the node. */
  incomingRps: number;
  /** Demand the node actually handled this tick (answered, successfully or not). */
  processedRps: number;
  /** Traffic forwarded downstream. */
  outgoingRps: number;
  /**
   * Requests that did not succeed for the caller: soft errors, timeouts, and
   * capacity refusals. `baseFailureRate = 0` still yields failures here when
   * the component cannot keep up.
   */
  failedRps: number;
  /**
   * Breakdown: refused without being processed (shed, throttle, full queue).
   * Already included in `failedRps` — kept so the UI can explain *how* it failed.
   */
  droppedRps: number;

  /** 0..∞ — 1 means "at configured capacity". Never clamped. */
  utilization: number;
  /** Time spent inside this node (service time + queue wait). */
  localLatencyMs: number;
  /** Accumulated latency from the sources up to and including this node. */
  totalLatencyMs: number;
  /** Estimated time to fully answer a request entering here (local + downstream). */
  responseLatencyMs: number;
  /**
   * What an *upstream caller* waits for, when that is less than the full local
   * latency. Set by asynchronous components (a queue acknowledges a publish
   * immediately; the consumer's backlog is not the producer's problem).
   */
  ackLatencyMs?: number;

  /** Items waiting to be processed (a count, never a rate). */
  queueDepth: number;
  status: LoadStatus;
  lastUpdatedAt: number;

  // --- Kind-specific, optional -------------------------------------------
  /** Cache: requests answered by the cache itself. */
  hitsRps?: number;
  /** Cache: requests that had to go downstream. */
  missesRps?: number;
  /** API Gateway: requests refused by the rate limit. */
  throttledRps?: number;
  /** Server / Database: requests dropped because they waited past the timeout. */
  timedOutRps?: number;
  /** Server: instances currently serving. */
  instances?: number;
  /** Database: pool pressure, `concurrentConnections / maxConnections`. */
  connectionUtilization?: number;
  /** Database: estimated concurrent connections in use. */
  concurrentConnections?: number;
  /** Message queue: seconds to drain the backlog, when it is actually draining. */
  drainSeconds?: number;
}

export interface EdgeMetrics {
  rps: number;
  failureRate: number;
  avgLatencyMs: number;
  status: LoadStatus;
}

export interface SystemMetrics {
  /** Traffic created by all clients. */
  generatedRps: number;
  /** Traffic that reached the end of its path without failing or being dropped. */
  completedRps: number;
  /**
   * Requests that did not succeed — soft errors, timeouts, and capacity
   * refusals. Includes what `droppedRps` breaks down.
   */
  failedRps: number;
  /** Capacity refusals only (subset of `failedRps`), for the scoreboard breakdown. */
  droppedRps: number;
  /** Accepted work still sitting in a backlog — neither completed nor failed. */
  bufferedRps: number;
  /** Weighted average of what a client waits for a full response. */
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

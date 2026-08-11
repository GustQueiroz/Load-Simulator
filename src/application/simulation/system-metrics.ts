import { capacityRpsOf } from '@/domain/nodes/capacity';
import type { SimulationGraph } from '@/domain/simulation/graph';
import type { NodeMetrics, SystemMetrics } from '@/domain/simulation/metrics';
import { worstStatus } from '@/domain/simulation/status';
import { clamp01, safeDivide } from '@/lib/math';

/**
 * Weights of the bottleneck heuristic. Utilization dominates, but a component
 * that fails or piles up work is promoted over one that is merely busy.
 */
const BOTTLENECK_WEIGHTS = { utilization: 0.65, failure: 0.2, queue: 0.15 } as const;
const BOTTLENECK_MIN_UTILIZATION = 0.6;

export function computeSystemMetrics(
  graph: SimulationGraph,
  metrics: ReadonlyMap<string, NodeMetrics>,
  previous: ReadonlyMap<string, NodeMetrics>,
  dtSeconds: number,
): SystemMetrics {
  let generatedRps = 0;
  let failedRps = 0;
  let droppedRps = 0;
  let bufferedRps = 0;
  let clientWeight = 0;
  let latencyProduct = 0;

  for (const node of graph.nodes) {
    const nodeMetrics = metrics.get(node.id);
    if (!nodeMetrics) continue;

    failedRps += nodeMetrics.failedRps;
    droppedRps += nodeMetrics.droppedRps;

    // Work parked in a backlog has neither completed nor failed yet.
    const backlogGrowth = nodeMetrics.queueDepth - (previous.get(node.id)?.queueDepth ?? 0);
    if (backlogGrowth > 0) bufferedRps += safeDivide(backlogGrowth, dtSeconds);

    if (node.kind === 'client') {
      generatedRps += nodeMetrics.processedRps;
      clientWeight += nodeMetrics.outgoingRps;
      latencyProduct += nodeMetrics.outgoingRps * nodeMetrics.responseLatencyMs;
    }
  }

  return {
    generatedRps,
    // `failedRps` already includes capacity refusals (shed/throttle/timeout).
    // Subtracting `droppedRps` again would double-count the same lost traffic.
    completedRps: Math.max(0, generatedRps - failedRps - bufferedRps),
    failedRps,
    droppedRps,
    bufferedRps,
    approximateEndToEndLatencyMs: clientWeight > 0 ? latencyProduct / clientWeight : 0,
    bottleneckNodeId: findBottleneck(graph, metrics),
    worstStatus: worstStatus([...metrics.values()].map((entry) => entry.status)),
  };
}

/**
 * "Probable bottleneck": the busiest component, nudged by failures and queue
 * pressure. Deliberately a heuristic — it points the audience at the right
 * box, it does not prove causality.
 */
function findBottleneck(
  graph: SimulationGraph,
  metrics: ReadonlyMap<string, NodeMetrics>,
): string | undefined {
  let bestId: string | undefined;
  let bestScore = 0;

  for (const node of graph.nodes) {
    if (node.kind === 'client') continue;
    const nodeMetrics = metrics.get(node.id);
    if (!nodeMetrics || nodeMetrics.incomingRps <= 0) continue;
    if (nodeMetrics.utilization < BOTTLENECK_MIN_UTILIZATION) continue;

    const failureShare = clamp01(
      safeDivide(nodeMetrics.failedRps, nodeMetrics.incomingRps),
    );
    const queuePressure = clamp01(safeDivide(nodeMetrics.queueDepth, capacityRpsOf(node)));
    const score =
      nodeMetrics.utilization * BOTTLENECK_WEIGHTS.utilization +
      failureShare * BOTTLENECK_WEIGHTS.failure +
      queuePressure * BOTTLENECK_WEIGHTS.queue;

    if (score > bestScore) {
      bestScore = score;
      bestId = node.id;
    }
  }

  return bestId;
}

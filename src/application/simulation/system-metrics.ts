import { capacityRpsOf } from '@/domain/nodes/capacity';
import type { SimulationGraph } from '@/domain/simulation/graph';
import type { NodeMetrics, SystemMetrics } from '@/domain/simulation/metrics';
import { isTrafficSource } from '@/domain/simulation/node-kind';
import { worstStatus } from '@/domain/simulation/status';
import { clamp01, safeDivide } from '@/lib/math';

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

    const backlogGrowth = nodeMetrics.queueDepth - (previous.get(node.id)?.queueDepth ?? 0);
    if (backlogGrowth > 0) bufferedRps += safeDivide(backlogGrowth, dtSeconds);

    if (isTrafficSource(node.kind)) {
      generatedRps += nodeMetrics.processedRps;
      clientWeight += nodeMetrics.outgoingRps;
      latencyProduct += nodeMetrics.outgoingRps * nodeMetrics.responseLatencyMs;
    }
  }

  return {
    generatedRps,

    completedRps: Math.max(0, generatedRps - failedRps - bufferedRps),
    failedRps,
    droppedRps,
    bufferedRps,
    approximateEndToEndLatencyMs: clientWeight > 0 ? latencyProduct / clientWeight : 0,
    bottleneckNodeId: findBottleneck(graph, metrics),
    worstStatus: worstStatus([...metrics.values()].map((entry) => entry.status)),
  };
}

function findBottleneck(
  graph: SimulationGraph,
  metrics: ReadonlyMap<string, NodeMetrics>,
): string | undefined {
  let bestId: string | undefined;
  let bestScore = 0;

  for (const node of graph.nodes) {
    if (isTrafficSource(node.kind)) continue;
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

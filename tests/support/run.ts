import { SimulationEngine, type SimulationFrame } from '@/application/simulation/engine';
import type { SimulationEdge, SimulationNode } from '@/domain/simulation/graph';
import type { NodeMetrics } from '@/domain/simulation/metrics';

export interface RunOptions {
  ticks?: number;
  tickMs?: number;
}

export function run(
  nodes: readonly SimulationNode[],
  edges: readonly SimulationEdge[],
  options: RunOptions = {},
): SimulationFrame {
  const engine = new SimulationEngine({ tickMs: options.tickMs ?? 100 });
  let frame = engine.tick(nodes, edges);
  for (let index = 1; index < (options.ticks ?? 1); index += 1) {
    frame = engine.tick(nodes, edges);
  }
  return frame;
}

export function metricsOf(frame: SimulationFrame, nodeId: string): NodeMetrics {
  const metrics = frame.nodeMetrics.get(nodeId);
  if (!metrics) throw new Error(`No metrics for node "${nodeId}"`);
  return metrics;
}

export function edgeRps(frame: SimulationFrame, source: string, target: string): number {
  return frame.edgeMetrics.get(`${source}->${target}`)?.rps ?? 0;
}

import type { NodeConfigByKind } from '@/domain/nodes/config';
import type { NodeRuntimeByKind } from '@/domain/nodes/runtime';
import type { NodeMetrics } from '@/domain/simulation/metrics';
import type { NodeKind } from '@/domain/simulation/node-kind';
import type { SimulationInput } from '@/domain/simulation/traffic';

export const DEFAULT_PORT = 'out';

export type RoutingPolicy =
  | { mode: 'broadcast' }
  | { mode: 'split'; weights?: Readonly<Record<string, number>> };

export const BROADCAST: RoutingPolicy = Object.freeze({ mode: 'broadcast' });

export interface FlowOutput {
  port?: string;
  rps: number;

  latencyMs: number;

  failureRate: number;
  routing: RoutingPolicy;
}

export interface TargetView {
  edgeId: string;
  nodeId: string;
  kind: NodeKind;
  enabled: boolean;

  capacityRps: number;

  previousUtilization: number;
}

export interface SimulationContext {
  tick: number;
  nowMs: number;
  dtSeconds: number;

  targets: readonly TargetView[];

  random: () => number;
}

export interface SimulationOutput<R = unknown> {
  metrics: Partial<NodeMetrics>;
  outputs: readonly FlowOutput[];
  runtimePatch?: Partial<R>;
}

export interface ComponentSimulator<C, R> {
  simulate(
    config: C,
    runtime: R,
    input: SimulationInput,
    context: SimulationContext,
  ): SimulationOutput<R>;
}

export type SimulatorFor<K extends NodeKind> = ComponentSimulator<
  NodeConfigByKind[K],
  NodeRuntimeByKind[K]
>;

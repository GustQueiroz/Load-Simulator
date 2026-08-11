import type { NodeConfigByKind } from '@/domain/nodes/config';
import type { NodeRuntimeByKind } from '@/domain/nodes/runtime';
import type { NodeMetrics } from '@/domain/simulation/metrics';
import type { NodeKind } from '@/domain/simulation/node-kind';
import type { SimulationInput } from '@/domain/simulation/traffic';

export const DEFAULT_PORT = 'out';

/**
 * How a simulator wants its output spread over the outgoing edges.
 *
 * - `broadcast`: every downstream dependency is called once per request
 *   (a server that talks to a cache *and* a database does both).
 * - `split`: the flow is shared between targets (load balancers, and queues
 *   with competing consumers).
 */
export type RoutingPolicy =
  | { mode: 'broadcast' }
  | { mode: 'split'; weights?: Readonly<Record<string, number>> };

export const BROADCAST: RoutingPolicy = Object.freeze({ mode: 'broadcast' });

export interface FlowOutput {
  port?: string;
  rps: number;
  /** Accumulated latency (upstream + local) carried by this flow. */
  latencyMs: number;
  /** Share of the original demand lost so far, 0..1. Informational. */
  failureRate: number;
  routing: RoutingPolicy;
}

/** What a simulator is allowed to know about one of its downstream targets. */
export interface TargetView {
  edgeId: string;
  nodeId: string;
  kind: NodeKind;
  enabled: boolean;
  /** Advertised capacity in req/s. */
  capacityRps: number;
  /** Utilization measured on the previous tick (0..∞). */
  previousUtilization: number;
}

export interface SimulationContext {
  tick: number;
  nowMs: number;
  dtSeconds: number;
  /** Downstream neighbours, in stable edge order. */
  targets: readonly TargetView[];
  /** Deterministic PRNG, seeded per node and tick. Never use `Math.random`. */
  random: () => number;
}

export interface SimulationOutput<R = unknown> {
  metrics: Partial<NodeMetrics>;
  outputs: readonly FlowOutput[];
  runtimePatch?: Partial<R>;
}

/**
 * The one contract every component kind implements. Pure: same inputs, same
 * outputs, no clock, no DOM, no store.
 */
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

import { capacityRpsOf } from '@/domain/nodes/capacity';
import { createInitialRuntime, type AnyNodeRuntime } from '@/domain/nodes/runtime';
import {
  buildSimulationGraph,
  outgoingEdgesOf,
  rebindNodes,
  type SimulationEdge,
  type SimulationGraph,
  type SimulationNode,
} from '@/domain/simulation/graph';
import {
  createEmptyMetrics,
  createEmptySystemMetrics,
  type EdgeMetrics,
  type NodeMetrics,
  type SystemMetrics,
} from '@/domain/simulation/metrics';
import { aggregateFlows, type TrafficFlow } from '@/domain/simulation/traffic';
import { createSeededRandom, hashString } from '@/lib/math';

import { capLatency } from './models/latency';
import { simulateNode } from './registry';
import { routeOutput } from './routing';
import { computeSystemMetrics } from './system-metrics';
import type { SimulationContext, TargetView } from './types';

export const DEFAULT_TICK_MS = 100;

export interface EngineOptions {
  tickMs?: number;
  /** Fixed seed keeps randomised algorithms reproducible across demos. */
  seed?: number;
}

export interface SimulationFrame {
  tick: number;
  elapsedSeconds: number;
  nodeMetrics: ReadonlyMap<string, NodeMetrics>;
  edgeMetrics: ReadonlyMap<string, EdgeMetrics>;
  system: SystemMetrics;
  /** Non-empty when the diagram contains a cycle and could not be simulated. */
  cycleNodeIds?: string[];
}

/**
 * Discrete-time fluid simulation.
 *
 * Every `tickMs` the whole graph is evaluated once, in topological order, and
 * a complete frame is produced. Nothing is written outside of the engine: the
 * caller decides what to do with the frame (commit to a store, assert in a
 * test, log it). No React, no DOM, no timers in here.
 */
export class SimulationEngine {
  private readonly runtimes = new Map<string, AnyNodeRuntime>();
  private previousMetrics: ReadonlyMap<string, NodeMetrics> = new Map();
  private graphCache: { key: string; graph: SimulationGraph } | null = null;
  private tickIndex = 0;
  private tickMs: number;
  private readonly seed: number;

  constructor(options: EngineOptions = {}) {
    this.tickMs = options.tickMs ?? DEFAULT_TICK_MS;
    this.seed = options.seed ?? 0x5eed;
  }

  get currentTick(): number {
    return this.tickIndex;
  }

  get dtSeconds(): number {
    return this.tickMs / 1000;
  }

  setTickMs(tickMs: number): void {
    if (tickMs > 0) this.tickMs = tickMs;
  }

  /** Clears runtime state (backlogs, metrics, clock). Configuration is untouched. */
  reset(): void {
    this.runtimes.clear();
    this.previousMetrics = new Map();
    this.tickIndex = 0;
  }

  /** Metrics of the last completed tick — used to render a stopped diagram. */
  get lastMetrics(): ReadonlyMap<string, NodeMetrics> {
    return this.previousMetrics;
  }

  tick(nodes: readonly SimulationNode[], edges: readonly SimulationEdge[]): SimulationFrame {
    const dtSeconds = this.dtSeconds;
    const graph = this.resolveGraph(nodes, edges);

    if (!graph.ok) {
      this.tickIndex += 1;
      return {
        tick: this.tickIndex,
        elapsedSeconds: this.tickIndex * dtSeconds,
        nodeMetrics: new Map(),
        edgeMetrics: new Map(),
        system: createEmptySystemMetrics(),
        cycleNodeIds: graph.cycleNodeIds,
      };
    }

    this.tickIndex += 1;
    const nowMs = this.tickIndex * this.tickMs;

    const inbox = new Map<string, TrafficFlow[]>();
    const nodeMetrics = new Map<string, NodeMetrics>();
    const edgeMetrics = new Map<string, EdgeMetrics>();

    for (const nodeId of graph.graph.topologicalOrder) {
      const node = graph.graph.nodesById.get(nodeId);
      if (!node) continue;

      const input = aggregateFlows(inbox.get(nodeId) ?? []);

      if (!node.config.enabled) {
        nodeMetrics.set(nodeId, disabledMetrics(input.incomingRps, nowMs));
        continue;
      }

      const context = this.createContext(graph.graph, node, dtSeconds, nowMs);
      const runtime = this.resolveRuntime(node);
      const result = simulateNode(node, runtime, input, context);

      nodeMetrics.set(nodeId, mergeMetrics(input.incomingRps, nowMs, result.metrics));
      if (result.runtimePatch) Object.assign(runtime, result.runtimePatch);

      const outgoing = outgoingEdgesOf(graph.graph, nodeId);
      for (const output of result.outputs) {
        for (const routed of routeOutput(output, outgoing)) {
          appendFlow(inbox, routed.edge.target, routed.flow);
          edgeMetrics.set(routed.edge.id, {
            rps: routed.flow.rps,
            failureRate: routed.flow.failureRate,
            avgLatencyMs: routed.flow.latencyMs,
            status: 'idle',
          });
        }
      }
    }

    applyResponseLatency(graph.graph, nodeMetrics, edgeMetrics);
    applyEdgeStatus(graph.graph, nodeMetrics, edgeMetrics);

    const system = computeSystemMetrics(graph.graph, nodeMetrics, this.previousMetrics, dtSeconds);
    this.previousMetrics = nodeMetrics;

    return {
      tick: this.tickIndex,
      elapsedSeconds: this.tickIndex * dtSeconds,
      nodeMetrics,
      edgeMetrics,
      system,
    };
  }

  private createContext(
    graph: SimulationGraph,
    node: SimulationNode,
    dtSeconds: number,
    nowMs: number,
  ): SimulationContext {
    // Re-seeded once per second per node: randomised balancing stays stable
    // enough to watch, and identical between two runs of the same demo.
    const secondBucket = Math.floor(nowMs / 1000);
    const random = createSeededRandom(this.seed ^ hashString(node.id) ^ secondBucket);

    return {
      tick: this.tickIndex,
      nowMs,
      dtSeconds,
      targets: this.buildTargets(graph, node.id),
      random,
    };
  }

  private buildTargets(graph: SimulationGraph, nodeId: string): TargetView[] {
    return outgoingEdgesOf(graph, nodeId).flatMap((edge) => {
      const target = graph.nodesById.get(edge.target);
      if (!target) return [];
      return [
        {
          edgeId: edge.id,
          nodeId: target.id,
          kind: target.kind,
          enabled: target.config.enabled,
          capacityRps: capacityRpsOf(target),
          previousUtilization: this.previousMetrics.get(target.id)?.utilization ?? 0,
        },
      ];
    });
  }

  private resolveRuntime(node: SimulationNode): AnyNodeRuntime {
    const existing = this.runtimes.get(node.id);
    if (existing) return existing;
    const created = createInitialRuntime(node.kind, node.config);
    this.runtimes.set(node.id, created);
    return created;
  }

  /**
   * Topology is only recomputed when it actually changes — configuration
   * edits (sliders) must not invalidate the cached ordering.
   */
  private resolveGraph(
    nodes: readonly SimulationNode[],
    edges: readonly SimulationEdge[],
  ): { ok: true; graph: SimulationGraph } | { ok: false; cycleNodeIds: string[] } {
    const key = topologyKey(nodes, edges);
    if (this.graphCache?.key === key) {
      return { ok: true, graph: rebindNodes(this.graphCache.graph, nodes) };
    }

    const result = buildSimulationGraph(nodes, edges);
    if (!result.ok) {
      this.graphCache = null;
      return { ok: false, cycleNodeIds: result.cycleNodeIds };
    }

    this.graphCache = { key, graph: result.graph };
    this.forgetRemovedNodes(result.graph);
    return { ok: true, graph: result.graph };
  }

  private forgetRemovedNodes(graph: SimulationGraph): void {
    for (const id of [...this.runtimes.keys()]) {
      if (!graph.nodesById.has(id)) this.runtimes.delete(id);
    }
  }
}

function topologyKey(
  nodes: readonly SimulationNode[],
  edges: readonly SimulationEdge[],
): string {
  const nodePart = nodes.map((node) => `${node.id}:${node.kind}`).join('|');
  const edgePart = edges
    .map((edge) => `${edge.id}>${edge.source}>${edge.target}>${edge.enabled ? 1 : 0}`)
    .join('|');
  return `${nodePart}#${edgePart}`;
}

function appendFlow(inbox: Map<string, TrafficFlow[]>, nodeId: string, flow: TrafficFlow): void {
  const list = inbox.get(nodeId);
  if (list) list.push(flow);
  else inbox.set(nodeId, [flow]);
}

function mergeMetrics(
  incomingRps: number,
  nowMs: number,
  patch: Partial<NodeMetrics>,
): NodeMetrics {
  return { ...createEmptyMetrics(nowMs), incomingRps, ...patch, lastUpdatedAt: nowMs };
}

function disabledMetrics(incomingRps: number, nowMs: number): NodeMetrics {
  return {
    ...createEmptyMetrics(nowMs),
    incomingRps,
    // A component that is down answers nothing: everything aimed at it is lost.
    failedRps: incomingRps,
    droppedRps: incomingRps,
  };
}

/**
 * Second pass, walked backwards: how long a request entering each node takes
 * to be answered, including everything it triggers downstream.
 *
 * Shares are `edgeRps / processedRps`, so traffic resolved locally (a cache
 * hit) correctly contributes zero downstream time.
 */
function applyResponseLatency(
  graph: SimulationGraph,
  nodeMetrics: Map<string, NodeMetrics>,
  edgeMetrics: ReadonlyMap<string, EdgeMetrics>,
): void {
  const downstream = new Map<string, number>();
  const order = graph.topologicalOrder;

  for (let index = order.length - 1; index >= 0; index -= 1) {
    const nodeId = order[index];
    const metrics = nodeMetrics.get(nodeId);
    if (!metrics) continue;

    let accumulated = 0;
    for (const edge of outgoingEdgesOf(graph, nodeId)) {
      const edgeRps = edgeMetrics.get(edge.id)?.rps ?? 0;
      if (edgeRps <= 0 || metrics.processedRps <= 0) continue;

      const target = nodeMetrics.get(edge.target);
      if (!target) continue;

      const share = edgeRps / metrics.processedRps;
      const targetCost =
        target.ackLatencyMs !== undefined
          ? target.ackLatencyMs
          : target.localLatencyMs + (downstream.get(edge.target) ?? 0);
      accumulated += share * targetCost;
    }

    downstream.set(nodeId, accumulated);
    metrics.responseLatencyMs = capLatency(metrics.localLatencyMs + accumulated);
  }
}

/** An edge is as hot as the component it feeds. */
function applyEdgeStatus(
  graph: SimulationGraph,
  nodeMetrics: ReadonlyMap<string, NodeMetrics>,
  edgeMetrics: Map<string, EdgeMetrics>,
): void {
  for (const edge of graph.edges) {
    const metrics = edgeMetrics.get(edge.id);
    if (!metrics) continue;
    metrics.status = nodeMetrics.get(edge.target)?.status ?? 'idle';
  }
}

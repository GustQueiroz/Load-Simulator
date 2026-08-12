import { estimateMonthlyCost } from '@/application/cost/cost-engine';
import { costProfileOf } from '@/application/cost/profiles';
import {
  EMPTY_HOLD,
  evaluateLesson,
  type HoldTracker,
  type LessonDefinition,
  type LessonFlag,
  type LessonObservation,
} from '@/application/lessons';
import { SimulationEngine } from '@/application/simulation/engine';
import { toSimulationEdges, toSimulationNodes } from '@/domain/diagram/diagram';
import type { AnyNodeConfig, NodeConfigByKind } from '@/domain/nodes/config';
import { createDefaultConfig } from '@/domain/nodes/defaults';
import type { DiagramEdge, DiagramNode } from '@/domain/diagram/diagram';
import type { NodeKind } from '@/domain/simulation/node-kind';

import { TEST_VOCABULARY } from './i18n';

export interface LessonSolution {
  /** Configuration the learner would change with the sliders. */
  patch?: Record<string, Record<string, unknown>>;
  /** Components the learner would drag in. */
  add?: { id: string; kind: NodeKind; config?: Record<string, unknown> }[];
  connect?: [string, string][];
  disconnect?: [string, string][];
  /** Simulated seconds to run. Defaults to whatever the win needs, plus slack. */
  seconds?: number;
  /** Ends paused — some lessons ask the learner to stop and look. */
  pauseAtEnd?: boolean;
}

export interface PlayResult {
  won: boolean;
  stars: 1 | 2 | 3;
  wonAtSeconds: number | null;
  /** Last observation, for diagnosing a lesson that did not complete. */
  final: LessonObservation;
}

const TICK_MS = 100;

/**
 * Plays a lesson the way a learner would: apply a solution, run the clock, and
 * evaluate the win exactly as the app does — same predicates, same hold
 * tracking, same cost estimate.
 */
export function playLesson(lesson: LessonDefinition, solution: LessonSolution = {}): PlayResult {
  const snapshot = lesson.build(TEST_VOCABULARY);
  let nodes = [...snapshot.nodes];
  let edges = [...snapshot.edges];

  for (const extra of solution.add ?? []) {
    nodes.push(makeNode(extra.id, extra.kind, extra.config));
  }

  if (solution.patch) {
    nodes = nodes.map((node) => {
      const patch = solution.patch?.[node.id];
      if (!patch) return node;
      return {
        ...node,
        data: { ...node.data, config: { ...node.data.config, ...patch } as AnyNodeConfig },
      } as DiagramNode;
    });
  }

  for (const [source, target] of solution.disconnect ?? []) {
    edges = edges.filter((edge) => !(edge.source === source && edge.target === target));
  }

  for (const [source, target] of solution.connect ?? []) {
    edges.push({ id: `e-${source}-${target}`, source, target, data: { enabled: true } });
  }

  const engine = new SimulationEngine({ tickMs: TICK_MS });
  const simNodes = toSimulationNodes(nodes);
  const simEdges = toSimulationEdges(edges);
  const profile = costProfileOf('aws');

  const flags: Record<LessonFlag, boolean> = {
    started: true,
    paused: false,
    sawQueueDepth: false,
  };

  let hold: HoldTracker = EMPTY_HOLD;
  let wonAtSeconds: number | null = null;
  let stars: 1 | 2 | 3 = 1;
  let observation = emptyObservation(flags);

  const totalTicks = Math.round(((solution.seconds ?? 30) * 1000) / TICK_MS);

  for (let tick = 0; tick < totalTicks; tick += 1) {
    const frame = engine.tick(simNodes, simEdges);

    // Mirrors the runner: the flag is set the first time a queue holds work.
    if (!flags.sawQueueDepth) {
      for (const node of simNodes) {
        if (node.kind !== 'messageQueue') continue;
        if ((frame.nodeMetrics.get(node.id)?.queueDepth ?? 0) > 0) flags.sawQueueDepth = true;
      }
    }

    observation = {
      status: 'running',
      tick: frame.tick,
      elapsedSeconds: frame.elapsedSeconds,
      flags: { ...flags },
      system: frame.system,
      nodes: new Map(simNodes.map((node) => [node.id, { kind: node.kind, config: node.config }])),
      nodeMetrics: frame.nodeMetrics,
      monthlyCostUsd: estimateMonthlyCost(simNodes, frame.nodeMetrics, profile)
        .infrastructureMonthlyUsd,
    };

    const evaluation = evaluateLesson(lesson, observation, hold);
    hold = evaluation.hold;

    if (evaluation.won && wonAtSeconds === null) {
      wonAtSeconds = frame.elapsedSeconds;
      stars = evaluation.stars;
      break;
    }
  }

  // Mirrors the runner: a status change is itself an evaluation point, since
  // no frames arrive once the engine stops. Lessons that end with "…and pause"
  // are won here, not on a tick.
  if (wonAtSeconds === null && solution.pauseAtEnd) {
    flags.paused = true;
    observation = { ...observation, status: 'paused', flags: { ...flags } };
    const evaluation = evaluateLesson(lesson, observation, hold);
    if (evaluation.won) {
      wonAtSeconds = observation.elapsedSeconds;
      stars = evaluation.stars;
    }
  }

  return { won: wonAtSeconds !== null, stars, wonAtSeconds, final: observation };
}

/** Readable diagnosis when a lesson does not complete. */
export function describeFinalState(result: PlayResult): string {
  const lines = [
    `elapsed=${result.final.elapsedSeconds.toFixed(1)}s`,
    `cost=$${result.final.monthlyCostUsd.toFixed(0)}`,
    `generated=${result.final.system.generatedRps.toFixed(0)}`,
    `completed=${result.final.system.completedRps.toFixed(0)}`,
    `failed=${result.final.system.failedRps.toFixed(0)}`,
  ];

  for (const [id, metrics] of result.final.nodeMetrics) {
    lines.push(
      `${id}: util=${(metrics.utilization * 100).toFixed(0)}% status=${metrics.status} failed=${metrics.failedRps.toFixed(0)}`,
    );
  }

  return lines.join('\n  ');
}

function makeNode(id: string, kind: NodeKind, config?: Record<string, unknown>): DiagramNode {
  const base = createDefaultConfig(kind, id) as NodeConfigByKind[NodeKind];
  return {
    id,
    type: kind,
    position: { x: 0, y: 0 },
    data: { kind, config: { ...base, ...config } } as DiagramNode['data'],
  };
}

function emptyObservation(flags: Record<LessonFlag, boolean>): LessonObservation {
  return {
    status: 'running',
    tick: 0,
    elapsedSeconds: 0,
    flags: { ...flags },
    system: {
      generatedRps: 0,
      completedRps: 0,
      failedRps: 0,
      droppedRps: 0,
      bufferedRps: 0,
      approximateEndToEndLatencyMs: 0,
      approximateP95LatencyMs: 0,
      worstStatus: 'idle',
    },
    nodes: new Map(),
    nodeMetrics: new Map(),
    monthlyCostUsd: 0,
  };
}

export type { DiagramEdge };

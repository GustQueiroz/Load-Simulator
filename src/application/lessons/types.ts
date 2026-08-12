import type { PresetVocabulary } from '@/application/presets/presets';
import type { DiagramSnapshot } from '@/domain/diagram/diagram';
import type { AnyNodeConfig } from '@/domain/nodes/config';
import type { NodeMetrics, SystemMetrics } from '@/domain/simulation/metrics';
import type { NodeKind } from '@/domain/simulation/node-kind';
import type { LoadStatus } from '@/domain/simulation/status';

export const LESSON_IDS = [
  '0.1',
  '0.2',
  '1.1',
  '1.2',
  '1.3',
  '1.4',
  '1.5',
  '2.1',
  '2.2',
  '2.3',
  '2.4',
  '2.5',
  '3.1',
  '3.2',
  '3.3',
  '3.4',
] as const;
export type LessonId = (typeof LESSON_IDS)[number];

export const WORLD_IDS = ['0', '1', '2', '3'] as const;
export type WorldId = (typeof WORLD_IDS)[number];

export type SimulationRunStatus = 'stopped' | 'running' | 'paused';

export type CompareOp = 'gt' | 'gte' | 'lt' | 'lte' | 'eq';

export type WinCondition =
  | { type: 'always' }
  | { type: 'and'; conditions: readonly WinCondition[] }
  | { type: 'or'; conditions: readonly WinCondition[] }
  | { type: 'flag'; flag: LessonFlag }
  | { type: 'run-status'; status: SimulationRunStatus }
  | { type: 'elapsed'; op: CompareOp; seconds: number }
  | { type: 'tick'; op: CompareOp; value: number }
  | { type: 'bottleneck'; nodeId: string }
  | { type: 'has-bottleneck' }
  | { type: 'node-status'; nodeId: string; status: LoadStatus }
  | { type: 'node-utilization'; nodeId: string; op: CompareOp; value: number }
  | { type: 'node-metric'; nodeId: string; metric: keyof NodeMetrics; op: CompareOp; value: number }
  | { type: 'config-number'; nodeId: string; key: string; op: CompareOp; value: number }
  | { type: 'system-metric'; metric: keyof SystemMetrics; op: CompareOp; value: number }
  | { type: 'failure-ratio'; op: CompareOp; value: number }
  | { type: 'completion-ratio'; op: CompareOp; value: number }
  | { type: 'monthly-cost'; op: CompareOp; value: number }
  | { type: 'has-kind'; kind: NodeKind }
  | { type: 'no-status'; status: LoadStatus }
  | { type: 'sustained'; seconds: number; condition: WinCondition };

export type LessonFlag = 'started' | 'paused' | 'sawQueueDepth';

export type BalloonAnchor =
  | { type: 'toolbar'; target: 'start' }
  | { type: 'panel'; target: 'system' }
  | { type: 'node'; nodeId: string }
  | { type: 'field'; nodeId: string; field: string };

export interface BalloonStep {
  id: string;
  titleKey: string;
  bodyKey: string;
  anchor: BalloonAnchor;
  advanceWhen?: WinCondition;
}

export type LessonMode = 'guided' | 'mission';

export type FieldLock = readonly string[] | '*';

export interface LessonLocks {
  trafficSources?: boolean;
  nodes?: Readonly<Record<string, FieldLock>>;
  kinds?: Readonly<Partial<Record<NodeKind, FieldLock>>>;
}

export interface LessonStars {
  two?: WinCondition;
  three?: WinCondition;
}

export interface LessonDefinition {
  id: LessonId;
  worldId: WorldId;
  order: number;
  minutes: number;
  mode: LessonMode;
  build: (vocabulary: PresetVocabulary) => DiagramSnapshot;
  win: WinCondition;
  balloons: readonly BalloonStep[];
  locks?: LessonLocks;
  stars?: LessonStars;
  budgetMonthlyUsd?: number;
  focusNodeId?: string;
  autoStart?: boolean;
}

export interface WorldDefinition {
  id: WorldId;
  order: number;
  lessonIds: readonly LessonId[];
}

export interface LessonObservation {
  status: SimulationRunStatus;
  tick: number;
  elapsedSeconds: number;
  flags: Readonly<Record<LessonFlag, boolean>>;
  system: SystemMetrics;
  nodes: ReadonlyMap<string, { kind: NodeKind; config: AnyNodeConfig }>;
  nodeMetrics: ReadonlyMap<string, NodeMetrics>;
  /**
   * Monthly **infrastructure** cost — components only, egress excluded.
   * A mission locks its traffic sources, so the bill for that traffic is not
   * something the learner can trade against; the size of the components is.
   */
  monthlyCostUsd: number;
}

/**
 * Elapsed-time bookkeeping for `sustained` conditions.
 *
 * Keyed by condition, so a lesson can hold several timers at once — one per
 * `sustained` in the win tree, in the star tiers, or in a balloon step.
 */
export interface HoldTracker {
  readonly since: Readonly<Record<string, number>>;
}

export const EMPTY_HOLD: HoldTracker = { since: {} };

export interface LessonProgressEntry {
  stars: 1 | 2 | 3;
  completedAt: string;
}

export type LessonProgressMap = Partial<Record<LessonId, LessonProgressEntry>>;

export const TRAFFIC_SOURCE_FIELD_KEYS = [
  'rps',
  'trafficMode',
  'rampStartRps',
  'rampDurationSeconds',
  'spikePeakRps',
  'spikeAtSeconds',
  'spikeWidthSeconds',
  'automatorRps',
  'requestsPerClick',
] as const;

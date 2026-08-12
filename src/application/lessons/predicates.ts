import type {
  CompareOp,
  HoldTracker,
  LessonObservation,
  WinCondition,
} from './types';
import { EMPTY_HOLD } from './types';

export function compare(op: CompareOp, left: number, right: number): boolean {
  switch (op) {
    case 'gt':
      return left > right;
    case 'gte':
      return left >= right;
    case 'lt':
      return left < right;
    case 'lte':
      return left <= right;
    case 'eq':
      return left === right;
  }
}

/**
 * Stable identity for a `sustained` condition.
 *
 * Conditions come from the frozen lesson catalogue, so the object reference is
 * stable for the whole session and the (relatively expensive) serialization
 * happens once per condition instead of once per tick.
 */
const conditionKeys = new WeakMap<object, string>();

function conditionKey(condition: WinCondition): string {
  const cached = conditionKeys.get(condition);
  if (cached !== undefined) return cached;
  const key = JSON.stringify(condition);
  conditionKeys.set(condition, key);
  return key;
}

function configNumber(observation: LessonObservation, nodeId: string, key: string): number | null {
  const node = resolveNode(observation, nodeId);
  if (!node) return null;
  const value = (node.config as unknown as Record<string, unknown>)[key];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function metricNumber(
  observation: LessonObservation,
  nodeId: string,
  metric: string,
): number | null {
  const metrics = resolveNodeMetrics(observation, nodeId);
  if (!metrics) return null;
  const value = (metrics as unknown as Record<string, unknown>)[metric];
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

/**
 * Lesson node ids follow a `<prefix>-<n>` convention so a condition can name
 * the component it grades. The map lets a lesson survive the learner deleting
 * and re-adding a node.
 */
const KIND_BY_PREFIX: Record<string, string> = {
  server: 'server',
  client: 'client',
  db: 'database',
  database: 'database',
  cache: 'cache',
  lb: 'loadBalancer',
  gateway: 'apiGateway',
  queue: 'messageQueue',
  button: 'button',
};

function resolveNodeId(observation: LessonObservation, nodeId: string): string | undefined {
  if (observation.nodes.has(nodeId) || observation.nodeMetrics.has(nodeId)) return nodeId;

  const kind = KIND_BY_PREFIX[nodeId.split('-')[0] ?? ''];
  if (!kind) return undefined;

  // Fall back only when there is no ambiguity. Picking "the first server" out
  // of three would silently grade the wrong component — better to report the
  // condition as unmet than to congratulate the learner for the wrong reason.
  let match: string | undefined;
  for (const [id, node] of observation.nodes) {
    if (node.kind !== kind) continue;
    if (match) return undefined;
    match = id;
  }
  return match;
}

function resolveNode(observation: LessonObservation, nodeId: string) {
  const id = resolveNodeId(observation, nodeId);
  return id === undefined ? undefined : observation.nodes.get(id);
}

function resolveNodeMetrics(observation: LessonObservation, nodeId: string) {
  const id = resolveNodeId(observation, nodeId);
  return id === undefined ? undefined : observation.nodeMetrics.get(id);
}

function isSameNodeRef(
  observation: LessonObservation,
  actualId: string | undefined,
  expectedId: string,
): boolean {
  if (!actualId) return false;
  if (actualId === expectedId) return true;
  return resolveNodeId(observation, expectedId) === actualId;
}

/**
 * Instantaneous truth of a condition.
 *
 * `sustained` is reported by its inner condition here — the elapsed part needs
 * a tracker, which only `evaluateCondition` carries. Use `evaluateWin` when the
 * answer has to respect time.
 */
export function isConditionMet(condition: WinCondition, observation: LessonObservation): boolean {
  switch (condition.type) {
    case 'always':
      return true;
    case 'and':
      return condition.conditions.every((item) => isConditionMet(item, observation));
    case 'or':
      return condition.conditions.some((item) => isConditionMet(item, observation));
    case 'flag':
      return observation.flags[condition.flag] === true;
    case 'run-status':
      return observation.status === condition.status;
    case 'elapsed':
      return compare(condition.op, observation.elapsedSeconds, condition.seconds);
    case 'tick':
      return compare(condition.op, observation.tick, condition.value);
    case 'bottleneck':
      return isSameNodeRef(observation, observation.system.bottleneckNodeId, condition.nodeId);
    case 'has-bottleneck':
      return Boolean(observation.system.bottleneckNodeId);
    case 'node-status': {
      const metrics = resolveNodeMetrics(observation, condition.nodeId);
      return metrics?.status === condition.status;
    }
    case 'node-utilization': {
      const metrics = resolveNodeMetrics(observation, condition.nodeId);
      if (!metrics) return false;
      return compare(condition.op, metrics.utilization, condition.value);
    }
    case 'node-metric': {
      const value = metricNumber(observation, condition.nodeId, condition.metric);
      if (value === null) return false;
      return compare(condition.op, value, condition.value);
    }
    case 'config-number': {
      const value = configNumber(observation, condition.nodeId, condition.key);
      if (value === null) return false;
      return compare(condition.op, value, condition.value);
    }
    case 'system-metric': {
      const value = observation.system[condition.metric];
      if (typeof value !== 'number' || !Number.isFinite(value)) return false;
      return compare(condition.op, value, condition.value);
    }
    case 'failure-ratio': {
      const generated = observation.system.generatedRps;
      if (generated <= 0) return false;
      return compare(condition.op, observation.system.failedRps / generated, condition.value);
    }
    case 'completion-ratio': {
      const generated = observation.system.generatedRps;
      if (generated <= 0) return false;
      return compare(condition.op, observation.system.completedRps / generated, condition.value);
    }
    case 'monthly-cost':
      return compare(condition.op, observation.monthlyCostUsd, condition.value);
    case 'has-kind': {
      for (const node of observation.nodes.values()) {
        if (node.kind === condition.kind && node.config.enabled !== false) return true;
      }
      return false;
    }
    case 'no-status': {
      for (const metrics of observation.nodeMetrics.values()) {
        if (metrics.status === condition.status) return false;
      }
      return observation.nodeMetrics.size > 0;
    }
    case 'sustained':
      return isConditionMet(condition.condition, observation);
  }
}

/**
 * Time-aware evaluation.
 *
 * Every `sustained` in the tree keeps its own timer, keyed by the condition
 * itself, so a lesson may hold several of them at once. `and` and `or`
 * deliberately do **not** short-circuit: a timer that stops being visited
 * would restart on the next tick, and two sustained conditions would reset
 * each other forever.
 */
function evaluateCondition(
  condition: WinCondition,
  observation: LessonObservation,
  previous: HoldTracker,
  next: Record<string, number>,
): boolean {
  switch (condition.type) {
    case 'and': {
      let ok = true;
      for (const child of condition.conditions) {
        if (!evaluateCondition(child, observation, previous, next)) ok = false;
      }
      return ok;
    }
    case 'or': {
      let ok = false;
      for (const child of condition.conditions) {
        if (evaluateCondition(child, observation, previous, next)) ok = true;
      }
      return ok;
    }
    case 'sustained': {
      // Recursive so a nested `sustained` keeps its own timer too.
      if (!evaluateCondition(condition.condition, observation, previous, next)) return false;

      const key = conditionKey(condition);
      const since = previous.since[key] ?? observation.elapsedSeconds;
      next[key] = since;
      return observation.elapsedSeconds - since >= condition.seconds;
    }
    default:
      return isConditionMet(condition, observation);
  }
}

export interface WinEvaluation {
  ok: boolean;
  hold: HoldTracker;
}

export function evaluateWin(
  condition: WinCondition,
  observation: LessonObservation,
  hold: HoldTracker = EMPTY_HOLD,
): WinEvaluation {
  const next: Record<string, number> = {};
  const ok = evaluateCondition(condition, observation, hold, next);
  return { ok, hold: { since: next } };
}

/**
 * Evaluates several condition trees against one observation, sharing a single
 * tracker. Star conditions therefore accumulate their own hold time on every
 * tick, exactly like the win condition does.
 */
export function evaluateAll(
  conditions: readonly (WinCondition | undefined)[],
  observation: LessonObservation,
  hold: HoldTracker = EMPTY_HOLD,
): { results: boolean[]; hold: HoldTracker } {
  const next: Record<string, number> = {};
  const results = conditions.map((condition) =>
    condition ? evaluateCondition(condition, observation, hold, next) : false,
  );
  return { results, hold: { since: next } };
}

function collectSustained(
  condition: WinCondition,
  found: Extract<WinCondition, { type: 'sustained' }>[] = [],
): Extract<WinCondition, { type: 'sustained' }>[] {
  if (condition.type === 'sustained') {
    found.push(condition);
    collectSustained(condition.condition, found);
  } else if (condition.type === 'and' || condition.type === 'or') {
    for (const child of condition.conditions) collectSustained(child, found);
  }
  return found;
}

/**
 * Progress of the hold the learner still has to complete — the least advanced
 * one, since that is what actually gates the win.
 */
export function describeHoldProgress(
  condition: WinCondition,
  observation: LessonObservation,
  hold: HoldTracker,
): { required: number; current: number } | null {
  const sustained = collectSustained(condition);
  if (sustained.length === 0) return null;

  let worst: { required: number; current: number; ratio: number } | null = null;

  for (const item of sustained) {
    const since = hold.since[conditionKey(item)];
    const current =
      since === undefined
        ? 0
        : Math.min(item.seconds, Math.max(0, observation.elapsedSeconds - since));
    const ratio = item.seconds > 0 ? current / item.seconds : 1;
    if (!worst || ratio < worst.ratio) worst = { required: item.seconds, current, ratio };
  }

  return worst ? { required: worst.required, current: worst.current } : null;
}

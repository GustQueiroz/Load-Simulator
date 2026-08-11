import type {
  CompareOp,
  HoldTracker,
  LessonObservation,
  WinCondition,
} from './types';

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

function configNumber(observation: LessonObservation, nodeId: string, key: string): number | null {
  const node = observation.nodes.get(nodeId) ?? resolveNode(observation, nodeId);
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

function resolveNode(observation: LessonObservation, nodeId: string) {
  const direct = observation.nodes.get(nodeId);
  if (direct) return direct;
  const kind = KIND_BY_PREFIX[nodeId.split('-')[0] ?? ''];
  if (!kind) return undefined;
  for (const node of observation.nodes.values()) {
    if (node.kind === kind) return node;
  }
  return undefined;
}

function resolveNodeMetrics(observation: LessonObservation, nodeId: string) {
  const direct = observation.nodeMetrics.get(nodeId);
  if (direct) return direct;
  const node = resolveNode(observation, nodeId);
  if (!node) return undefined;
  for (const [id, entry] of observation.nodes) {
    if (entry === node) return observation.nodeMetrics.get(id);
  }
  return undefined;
}

function isSameNodeRef(
  observation: LessonObservation,
  actualId: string | undefined,
  expectedId: string,
): boolean {
  if (!actualId) return false;
  if (actualId === expectedId) return true;
  const expected = resolveNode(observation, expectedId);
  const actual = observation.nodes.get(actualId);
  return Boolean(expected && actual && expected === actual);
}

/** Evaluate a condition ignoring sustained timing (inner truth only). */
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

function sustainedKey(condition: WinCondition): string | null {
  if (condition.type === 'sustained') {
    return JSON.stringify(condition);
  }
  if (condition.type === 'and' || condition.type === 'or') {
    for (const child of condition.conditions) {
      const nested = sustainedKey(child);
      if (nested) return nested;
    }
  }
  return null;
}

function sustainedSecondsRequired(condition: WinCondition): number | null {
  if (condition.type === 'sustained') return condition.seconds;
  if (condition.type === 'and' || condition.type === 'or') {
    for (const child of condition.conditions) {
      const nested = sustainedSecondsRequired(child);
      if (nested !== null) return nested;
    }
  }
  return null;
}

/**
 * Full evaluation including sustained windows. Updates hold tracker.
 * For `and` containing a sustained clause, every sibling must also hold.
 */
export function evaluateWin(
  condition: WinCondition,
  observation: LessonObservation,
  hold: HoldTracker,
): { ok: boolean; hold: HoldTracker } {
  if (condition.type === 'sustained') {
    const inner = isConditionMet(condition.condition, observation);
    if (!inner) {
      return { ok: false, hold: { key: null, sinceElapsed: null } };
    }
    const key = JSON.stringify(condition);
    const since =
      hold.key === key && hold.sinceElapsed !== null ? hold.sinceElapsed : observation.elapsedSeconds;
    const held = observation.elapsedSeconds - since;
    return {
      ok: held >= condition.seconds,
      hold: { key, sinceElapsed: since },
    };
  }

  if (condition.type === 'and') {
    let nextHold = hold;
    for (const child of condition.conditions) {
      const result = evaluateWin(child, observation, nextHold);
      nextHold = result.hold;
      if (!result.ok) return { ok: false, hold: nextHold };
    }
    return { ok: true, hold: nextHold };
  }

  if (condition.type === 'or') {
    for (const child of condition.conditions) {
      const result = evaluateWin(child, observation, hold);
      if (result.ok) return result;
    }
    return { ok: false, hold: { key: null, sinceElapsed: null } };
  }

  return { ok: isConditionMet(condition, observation), hold };
}

export function describeHoldProgress(
  condition: WinCondition,
  observation: LessonObservation,
  hold: HoldTracker,
): { required: number; current: number } | null {
  const required = sustainedSecondsRequired(condition);
  const key = sustainedKey(condition);
  if (required === null || key === null) return null;
  if (hold.key !== key || hold.sinceElapsed === null) {
    return { required, current: 0 };
  }
  return {
    required,
    current: Math.min(required, Math.max(0, observation.elapsedSeconds - hold.sinceElapsed)),
  };
}

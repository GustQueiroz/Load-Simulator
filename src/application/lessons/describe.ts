import type { LoadStatus } from '@/domain/simulation/status';

import type { CompareOp, WinCondition } from './types';

/**
 * A win condition, flattened into phrases the UI can render.
 *
 * Star tiers are written in the condition DSL, which means the requirement
 * already exists in machine-readable form. Describing it here — instead of
 * writing the same requirement again as prose in the catalog — is the only way
 * the explanation cannot drift from what is actually graded.
 */
export type ConditionClause =
  | { kind: 'failure-ratio'; op: CompareOp; value: number }
  | { kind: 'completion-ratio'; op: CompareOp; value: number }
  | { kind: 'monthly-cost'; op: CompareOp; value: number }
  | { kind: 'node-utilization'; nodeId: string; nodeLabel: string; op: CompareOp; value: number }
  | { kind: 'node-status'; nodeId: string; nodeLabel: string; status: LoadStatus }
  | { kind: 'no-status'; status: LoadStatus }
  | { kind: 'has-kind'; nodeKind: string }
  | { kind: 'sustained'; seconds: number; of: readonly ConditionClause[] }
  | { kind: 'latency'; op: CompareOp; value: number }
  /** Anything with no phrasing of its own — described by the lesson goal instead. */
  | { kind: 'opaque' };

export type NodeLabelLookup = (nodeId: string) => string;

/**
 * Flattens a condition into clauses. `and` disappears — its children become
 * siblings — because a requirement reads as a list, not as a tree.
 */
export function describeCondition(
  condition: WinCondition | undefined,
  labelOf: NodeLabelLookup,
): ConditionClause[] {
  if (!condition) return [];

  switch (condition.type) {
    case 'and':
      return condition.conditions.flatMap((child) => describeCondition(child, labelOf));

    case 'sustained': {
      const of = describeCondition(condition.condition, labelOf);
      if (of.length === 0) return [];
      return [{ kind: 'sustained', seconds: condition.seconds, of }];
    }

    case 'failure-ratio':
      return [{ kind: 'failure-ratio', op: condition.op, value: condition.value }];

    case 'completion-ratio':
      return [{ kind: 'completion-ratio', op: condition.op, value: condition.value }];

    case 'monthly-cost':
      return [{ kind: 'monthly-cost', op: condition.op, value: condition.value }];

    case 'node-utilization':
      return [
        {
          kind: 'node-utilization',
          nodeId: condition.nodeId,
          nodeLabel: labelOf(condition.nodeId),
          op: condition.op,
          value: condition.value,
        },
      ];

    case 'node-status':
      return [
        {
          kind: 'node-status',
          nodeId: condition.nodeId,
          nodeLabel: labelOf(condition.nodeId),
          status: condition.status,
        },
      ];

    case 'no-status':
      return [{ kind: 'no-status', status: condition.status }];

    case 'has-kind':
      return [{ kind: 'has-kind', nodeKind: condition.kind }];

    case 'system-metric':
      return condition.metric === 'approximateEndToEndLatencyMs' ||
        condition.metric === 'approximateP95LatencyMs'
        ? [{ kind: 'latency', op: condition.op, value: condition.value }]
        : [{ kind: 'opaque' }];

    // `started`, `elapsed`, `tick`, `run-status` and friends are bookkeeping,
    // not something to ask the learner for.
    case 'flag':
    case 'run-status':
    case 'elapsed':
    case 'tick':
    case 'always':
      return [];

    default:
      return [{ kind: 'opaque' }];
  }
}

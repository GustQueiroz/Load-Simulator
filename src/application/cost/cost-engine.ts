import { capacityRpsOf } from '@/domain/nodes/capacity';
import type { SimulationNode } from '@/domain/simulation/graph';
import type { NodeMetrics } from '@/domain/simulation/metrics';
import { NODE_KINDS, type NodeKind } from '@/domain/simulation/node-kind';

import { SECONDS_PER_MONTH, type CostEstimate, type CostLine, type CostProfile } from './types';

const KB_PER_GB = 1024 * 1024;

/**
 * Rough monthly cost of the drawn architecture.
 *
 * Two ingredients: what is *provisioned* (capacity and instances, charged
 * whether or not anyone uses it) and what is *consumed* (requests and egress,
 * taken from the current simulation). Always presented as an estimate.
 */
export interface CostUsage {
  /**
   * Traffic that actually left the system, in req/s. Requests that failed or
   * were shed never produced a full response, so billing them as egress would
   * make a collapsing architecture look expensive for the wrong reason.
   */
  egressRps?: number;
}

export function estimateMonthlyCost(
  nodes: readonly SimulationNode[],
  metrics: ReadonlyMap<string, NodeMetrics>,
  profile: CostProfile,
  usage: CostUsage = {},
): CostEstimate {
  const totals = new Map<NodeKind, number>();
  let fallbackEgressRps = 0;

  for (const node of nodes) {
    if (!node.config.enabled) continue;

    const model = profile.components[node.kind];
    const nodeMetrics = metrics.get(node.id);
    const requestsPerMonth = (nodeMetrics?.processedRps ?? 0) * SECONDS_PER_MONTH;

    const instances = node.kind === 'server' ? Math.max(1, node.config.instances) : 1;
    const capacity = capacityRpsOf(node);

    const cost =
      model.fixedMonthlyUsd +
      (model.perInstanceMonthlyUsd ?? 0) * instances +
      ((model.per100RpsMonthlyUsd ?? 0) * capacity) / 100 +
      ((model.perMillionRequestsUsd ?? 0) * requestsPerMonth) / 1_000_000;

    totals.set(node.kind, (totals.get(node.kind) ?? 0) + cost);

    // Clients are the exit door of the system.
    if (node.kind === 'client') fallbackEgressRps += nodeMetrics?.processedRps ?? 0;
  }

  const egressRps = usage.egressRps ?? fallbackEgressRps;
  const egressGb = (egressRps * SECONDS_PER_MONTH * profile.avgResponseKb) / KB_PER_GB;

  const lines: CostLine[] = [];
  for (const kind of NODE_KINDS) {
    const value = totals.get(kind);
    if (!value) continue;
    lines.push({ key: kind, monthlyUsd: value, serviceName: profile.serviceNames?.[kind] });
  }

  const egressCost = egressGb * profile.egressUsdPerGb;
  if (egressCost > 0) {
    lines.push({
      key: 'traffic',
      monthlyUsd: egressCost,
      egressGb,
      avgResponseKb: profile.avgResponseKb,
    });
  }

  return {
    lines,
    totalMonthlyUsd: lines.reduce((total, line) => total + line.monthlyUsd, 0),
  };
}

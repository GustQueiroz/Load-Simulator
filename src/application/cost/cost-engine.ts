import { capacityRpsOf } from '@/domain/nodes/capacity';
import type { SimulationNode } from '@/domain/simulation/graph';
import type { NodeMetrics } from '@/domain/simulation/metrics';
import { isTrafficSource, NODE_KINDS, type NodeKind } from '@/domain/simulation/node-kind';

import { SECONDS_PER_MONTH, type CostEstimate, type CostLine, type CostProfile } from './types';

const KB_PER_GB = 1024 * 1024;

export interface CostUsage {
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

    if (isTrafficSource(node.kind)) fallbackEgressRps += nodeMetrics?.processedRps ?? 0;
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

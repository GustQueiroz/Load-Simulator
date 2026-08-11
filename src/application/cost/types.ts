import type { NodeKind } from '@/domain/simulation/node-kind';

export type CloudProvider = 'generic' | 'aws' | 'gcp' | 'azure';

export const CLOUD_PROVIDERS: readonly CloudProvider[] = ['generic', 'aws', 'gcp', 'azure'];

export interface ComponentCostModel {
  fixedMonthlyUsd: number;
  perInstanceMonthlyUsd?: number;
  per100RpsMonthlyUsd?: number;
  perMillionRequestsUsd?: number;
}

export interface CostProfile {
  id: CloudProvider;
  label: string;
  serviceNames?: Partial<Record<NodeKind, string>>;
  components: Record<NodeKind, ComponentCostModel>;
  egressUsdPerGb: number;
  avgResponseKb: number;
}
export interface CostLine {
  key: NodeKind | 'traffic';
  monthlyUsd: number;
  serviceName?: string;
  egressGb?: number;
  avgResponseKb?: number;
}

export interface CostEstimate {
  lines: CostLine[];
  totalMonthlyUsd: number;
}

export const SECONDS_PER_MONTH = 60 * 60 * 24 * 30;

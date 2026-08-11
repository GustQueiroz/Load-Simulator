import type { NodeKind } from '@/domain/simulation/node-kind';

export type CloudProvider = 'generic' | 'aws' | 'gcp' | 'azure';

export const CLOUD_PROVIDERS: readonly CloudProvider[] = ['generic', 'aws', 'gcp', 'azure'];

/**
 * How much one component of a kind costs per month.
 *
 * All numbers are illustrative orders of magnitude, chosen so the *shape* of
 * the trade-off is right (a cache is cheaper than the database it protects).
 * They are not a price list and must never be presented as billing.
 */
export interface ComponentCostModel {
  /** Charged as soon as the component exists. */
  fixedMonthlyUsd: number;
  /** Multiplied by `instances` (servers). */
  perInstanceMonthlyUsd?: number;
  /** Multiplied by provisioned capacity, per 100 req/s. */
  per100RpsMonthlyUsd?: number;
  /** Usage based, from the traffic actually measured in the simulation. */
  perMillionRequestsUsd?: number;
}

export interface CostProfile {
  id: CloudProvider;
  label: string;
  /**
   * Conceptual service names ("EC2-like"). No vendor branding — this is a
   * didactic tool — and no translation: they read the same in every locale,
   * which is why the generic profile simply omits them.
   */
  serviceNames?: Partial<Record<NodeKind, string>>;
  components: Record<NodeKind, ComponentCostModel>;
  /** Egress price per GB. */
  egressUsdPerGb: number;
  /** Assumed average response size, used only for the traffic line. */
  avgResponseKb: number;
}

/**
 * A cost line identifies *what* it charges for; the label is the presentation
 * layer's job, so this module carries no user-facing copy.
 */
export interface CostLine {
  key: NodeKind | 'traffic';
  monthlyUsd: number;
  serviceName?: string;
  /** Only on the traffic line. */
  egressGb?: number;
  avgResponseKb?: number;
}

export interface CostEstimate {
  lines: CostLine[];
  totalMonthlyUsd: number;
}

export const SECONDS_PER_MONTH = 60 * 60 * 24 * 30;

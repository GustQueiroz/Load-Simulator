import type { CloudProvider, CostProfile } from './types';

const genericProfile: CostProfile = {
  id: 'generic',
  label: 'Generic',
  components: {
    client: { fixedMonthlyUsd: 0 },
    button: { fixedMonthlyUsd: 0 },
    loadBalancer: { fixedMonthlyUsd: 18, per100RpsMonthlyUsd: 0.4 },
    apiGateway: { fixedMonthlyUsd: 12, perMillionRequestsUsd: 1.1 },
    server: { fixedMonthlyUsd: 0, perInstanceMonthlyUsd: 18, per100RpsMonthlyUsd: 9 },
    cache: { fixedMonthlyUsd: 25, per100RpsMonthlyUsd: 0.6 },
    messageQueue: { fixedMonthlyUsd: 8, perMillionRequestsUsd: 0.4 },
    database: { fixedMonthlyUsd: 30, per100RpsMonthlyUsd: 22 },
  },
  egressUsdPerGb: 0.09,
  avgResponseKb: 12,
};

const awsProfile: CostProfile = {
  ...genericProfile,
  id: 'aws',
  label: 'AWS',
  serviceNames: {
    loadBalancer: 'ALB-like',
    apiGateway: 'API Gateway-like',
    server: 'EC2-like',
    cache: 'ElastiCache-like',
    messageQueue: 'SQS-like',
    database: 'RDS-like',
  },
};

const gcpProfile: CostProfile = {
  ...genericProfile,
  id: 'gcp',
  label: 'GCP',
  serviceNames: {
    loadBalancer: 'Cloud Load Balancing-like',
    apiGateway: 'API Gateway-like',
    server: 'Compute Engine-like',
    cache: 'Memorystore-like',
    messageQueue: 'Pub/Sub-like',
    database: 'Cloud SQL-like',
  },
  components: {
    ...genericProfile.components,
    loadBalancer: { fixedMonthlyUsd: 20, per100RpsMonthlyUsd: 0.35 },
    database: { fixedMonthlyUsd: 28, per100RpsMonthlyUsd: 21 },
  },
  egressUsdPerGb: 0.12,
};

const azureProfile: CostProfile = {
  ...genericProfile,
  id: 'azure',
  label: 'Azure',
  serviceNames: {
    loadBalancer: 'Load Balancer-like',
    apiGateway: 'API Management-like',
    server: 'Virtual Machines-like',
    cache: 'Cache for Redis-like',
    messageQueue: 'Service Bus-like',
    database: 'SQL Database-like',
  },
  components: {
    ...genericProfile.components,
    apiGateway: { fixedMonthlyUsd: 15, perMillionRequestsUsd: 1.0 },
    cache: { fixedMonthlyUsd: 27, per100RpsMonthlyUsd: 0.6 },
  },
  egressUsdPerGb: 0.087,
};

export const COST_PROFILES: Record<CloudProvider, CostProfile> = {
  generic: genericProfile,
  aws: awsProfile,
  gcp: gcpProfile,
  azure: azureProfile,
};

export function costProfileOf(cloud: CloudProvider): CostProfile {
  return COST_PROFILES[cloud];
}

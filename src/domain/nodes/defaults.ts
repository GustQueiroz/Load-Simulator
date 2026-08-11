import type { NodeKind } from '../simulation/node-kind';
import type { NodeConfigByKind } from './config';

/**
 * Pedagogical defaults, not benchmarks. They are deliberately small so a
 * bottleneck appears within a couple of drags — the point of the tool is to
 * make consequences visible, not to model a real fleet.
 */
export const DEFAULT_CONFIGS: { [K in NodeKind]: Omit<NodeConfigByKind[K], 'label'> } = {
  client: {
    enabled: true,
    baseLatencyMs: 0,
    baseFailureRate: 0,
    rps: 50,
  },
  loadBalancer: {
    enabled: true,
    baseLatencyMs: 3,
    baseFailureRate: 0,
    capacityRps: 5_000,
    algorithm: 'roundRobin',
    weights: {},
  },
  apiGateway: {
    enabled: true,
    baseLatencyMs: 8,
    baseFailureRate: 0,
    // Capacity above the rate limit on purpose: the gateway is meant to shed
    // load comfortably, not to fall over while protecting what is behind it.
    capacityRps: 5_000,
    rateLimitRps: 3_000,
    authEnabled: false,
    authLatencyMs: 12,
  },
  server: {
    enabled: true,
    baseLatencyMs: 25,
    baseFailureRate: 0,
    capacityRps: 100,
    instances: 1,
    maxQueueSize: 500,
    timeoutMs: 3_000,
  },
  cache: {
    enabled: true,
    baseLatencyMs: 0,
    baseFailureRate: 0,
    capacityRps: 10_000,
    hitRate: 0.8,
    hitLatencyMs: 2,
    missOverheadMs: 3,
  },
  messageQueue: {
    enabled: true,
    baseLatencyMs: 2,
    baseFailureRate: 0,
    ingressCapacityRps: 10_000,
    deliveryCapacityRps: 100,
    maxBacklog: 1_000_000,
  },
  database: {
    enabled: true,
    baseLatencyMs: 40,
    baseFailureRate: 0,
    capacityRps: 50,
    maxConnections: 100,
    maxQueueSize: 500,
    timeoutMs: 5_000,
  },
};

// Display names live in `src/i18n`: the domain must not carry user-facing copy.

export function createDefaultConfig<K extends NodeKind>(
  kind: K,
  label: string,
): NodeConfigByKind[K] {
  // Structured clone keeps nested objects (e.g. load balancer weights) from
  // being shared between nodes.
  const base = structuredClone(DEFAULT_CONFIGS[kind]) as Omit<NodeConfigByKind[K], 'label'>;
  return { ...base, label } as NodeConfigByKind[K];
}

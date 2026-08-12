import type { NodeKind } from '../simulation/node-kind';
import type { NodeConfigByKind } from './config';

export const DEFAULT_CONFIGS: { [K in NodeKind]: Omit<NodeConfigByKind[K], 'label'> } = {
  client: {
    enabled: true,
    fanout: 'broadcast',
    baseLatencyMs: 0,
    baseFailureRate: 0,
    rps: 50,
    retryEnabled: false,
    maxRetries: 2,
    trafficMode: 'constant',
    rampStartRps: 0,
    rampDurationSeconds: 10,
    spikePeakRps: 500,
    spikeAtSeconds: 5,
    spikeWidthSeconds: 2,
  },
  button: {
    enabled: true,
    fanout: 'broadcast',
    baseLatencyMs: 0,
    baseFailureRate: 0,
    requestsPerClick: 1,
    automatorRps: 0,
    rateLimitRps: 0,
    cooldownMs: 0,
    maxPending: 1_000,
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
    fanout: 'broadcast',
    baseLatencyMs: 8,
    baseFailureRate: 0,

    capacityRps: 5_000,
    rateLimitRps: 3_000,
    authEnabled: false,
    authLatencyMs: 12,
  },
  server: {
    enabled: true,
    fanout: 'broadcast',
    baseLatencyMs: 25,
    baseFailureRate: 0,
    capacityRps: 100,
    instances: 1,
    maxQueueSize: 500,
    timeoutMs: 3_000,
  },
  cache: {
    enabled: true,
    fanout: 'broadcast',
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
    fanout: 'broadcast',
    baseLatencyMs: 40,
    baseFailureRate: 0,
    capacityRps: 50,
    maxConnections: 100,
    maxQueueSize: 500,
    timeoutMs: 5_000,
  },
};

export function createDefaultConfig<K extends NodeKind>(
  kind: K,
  label: string,
): NodeConfigByKind[K] {

  const base = structuredClone(DEFAULT_CONFIGS[kind]) as Omit<NodeConfigByKind[K], 'label'>;
  return { ...base, label } as NodeConfigByKind[K];
}

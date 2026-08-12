import type { NodeKind } from '../simulation/node-kind';

export interface BaseNodeConfig {
  label: string;
  enabled: boolean;
  baseLatencyMs: number;

  baseFailureRate: number;
}

export const CLIENT_TRAFFIC_MODES = ['constant', 'ramp', 'spike'] as const;
export type ClientTrafficMode = (typeof CLIENT_TRAFFIC_MODES)[number];


/**
 * What a component does when it has more than one downstream dependency.
 *
 * `broadcast` — every dependency is called once per request (a server that
 * reads a cache *and* writes a database pays for both).
 * `split` — the flow is shared between them (sharding, or a second copy of
 * the same dependency).
 *
 * Balancers and queues are always `split`: distributing is what they are.
 */
export type FanoutMode = 'broadcast' | 'split';

export interface FanoutConfig {
  fanout: FanoutMode;
}

export interface ClientConfig extends BaseNodeConfig, FanoutConfig {
  /** Re-send what failed downstream. This is how an outage feeds itself. */
  retryEnabled: boolean;
  /** Attempts after the first one. */
  maxRetries: number;

  rps: number;
  trafficMode: ClientTrafficMode;

  rampStartRps: number;
  rampDurationSeconds: number;

  spikePeakRps: number;

  spikeAtSeconds: number;

  spikeWidthSeconds: number;
}

export interface ButtonConfig extends BaseNodeConfig, FanoutConfig {
  requestsPerClick: number;

  automatorRps: number;

  rateLimitRps: number;

  cooldownMs: number;

  maxPending: number;
}

export const LOAD_BALANCING_ALGORITHMS = [
  'roundRobin',
  'weightedRoundRobin',
  'leastLoad',
  'random',
] as const;

export type LoadBalancingAlgorithm = (typeof LOAD_BALANCING_ALGORITHMS)[number];

export interface LoadBalancerConfig extends BaseNodeConfig {
  capacityRps: number;
  algorithm: LoadBalancingAlgorithm;

  weights: Record<string, number>;
}

export interface ApiGatewayConfig extends BaseNodeConfig, FanoutConfig {
  capacityRps: number;
  rateLimitRps: number;
  authEnabled: boolean;
  authLatencyMs: number;
}

export interface ServerConfig extends BaseNodeConfig, FanoutConfig {

  capacityRps: number;
  instances: number;

  maxQueueSize: number;
  timeoutMs: number;
}

export interface CacheConfig extends BaseNodeConfig, FanoutConfig {
  capacityRps: number;

  hitRate: number;
  hitLatencyMs: number;

  missOverheadMs: number;
}

export interface MessageQueueConfig extends BaseNodeConfig {
  ingressCapacityRps: number;
  deliveryCapacityRps: number;

  maxBacklog: number;
}

export interface DatabaseConfig extends BaseNodeConfig, FanoutConfig {
  capacityRps: number;
  maxConnections: number;
  maxQueueSize: number;
  timeoutMs: number;
}

export interface NodeConfigByKind {
  client: ClientConfig;
  button: ButtonConfig;
  loadBalancer: LoadBalancerConfig;
  apiGateway: ApiGatewayConfig;
  server: ServerConfig;
  cache: CacheConfig;
  messageQueue: MessageQueueConfig;
  database: DatabaseConfig;
}

export type AnyNodeConfig = NodeConfigByKind[NodeKind];

export type SimulatorNodeData = {
  [K in NodeKind]: { kind: K; config: NodeConfigByKind[K] };
}[NodeKind];

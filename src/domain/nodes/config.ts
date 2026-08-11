import type { NodeKind } from '../simulation/node-kind';

export interface BaseNodeConfig {
  label: string;
  enabled: boolean;
  baseLatencyMs: number;

  baseFailureRate: number;
}

export const CLIENT_TRAFFIC_MODES = ['constant', 'ramp', 'spike'] as const;
export type ClientTrafficMode = (typeof CLIENT_TRAFFIC_MODES)[number];

export interface ClientConfig extends BaseNodeConfig {

  rps: number;
  trafficMode: ClientTrafficMode;

  rampStartRps: number;
  rampDurationSeconds: number;

  spikePeakRps: number;

  spikeAtSeconds: number;

  spikeWidthSeconds: number;
}

export interface ButtonConfig extends BaseNodeConfig {
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

export interface ApiGatewayConfig extends BaseNodeConfig {
  capacityRps: number;
  rateLimitRps: number;
  authEnabled: boolean;
  authLatencyMs: number;
}

export interface ServerConfig extends BaseNodeConfig {

  capacityRps: number;
  instances: number;

  maxQueueSize: number;
  timeoutMs: number;
}

export interface CacheConfig extends BaseNodeConfig {
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

export interface DatabaseConfig extends BaseNodeConfig {
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

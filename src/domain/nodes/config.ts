import type { NodeKind } from '../simulation/node-kind';

/**
 * Every component shares these. Note there is a single failure knob
 * (`baseFailureRate`) for all kinds — overload failures are derived by the
 * engine and must not be configured twice.
 */
export interface BaseNodeConfig {
  label: string;
  enabled: boolean;
  baseLatencyMs: number;
  /** 0..1 */
  baseFailureRate: number;
}

export interface ClientConfig extends BaseNodeConfig {
  /** Requests per second this client tries to generate. */
  rps: number;
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
  /** targetNodeId -> weight, only used by `weightedRoundRobin`. Missing = 1. */
  weights: Record<string, number>;
}

export interface ApiGatewayConfig extends BaseNodeConfig {
  capacityRps: number;
  rateLimitRps: number;
  authEnabled: boolean;
  authLatencyMs: number;
}

export interface ServerConfig extends BaseNodeConfig {
  /** Capacity of a *single* instance; total capacity is `capacityRps * instances`. */
  capacityRps: number;
  instances: number;
  /** Max items allowed to wait. Beyond this, load is shed. */
  maxQueueSize: number;
  timeoutMs: number;
}

export interface CacheConfig extends BaseNodeConfig {
  capacityRps: number;
  /** 0..1 — share of requests answered without touching downstream. */
  hitRate: number;
  hitLatencyMs: number;
  /** Extra cost paid by a miss before it is forwarded downstream. */
  missOverheadMs: number;
}

export interface MessageQueueConfig extends BaseNodeConfig {
  ingressCapacityRps: number;
  deliveryCapacityRps: number;
  /** Backlog ceiling, in messages (a count, not a rate). */
  maxBacklog: number;
}

export interface DatabaseConfig extends BaseNodeConfig {
  capacityRps: number;
  maxConnections: number;
  maxQueueSize: number;
  timeoutMs: number;
}

/** Single source of truth mapping a kind to its configuration shape. */
export interface NodeConfigByKind {
  client: ClientConfig;
  loadBalancer: LoadBalancerConfig;
  apiGateway: ApiGatewayConfig;
  server: ServerConfig;
  cache: CacheConfig;
  messageQueue: MessageQueueConfig;
  database: DatabaseConfig;
}

export type AnyNodeConfig = NodeConfigByKind[NodeKind];

/**
 * Discriminated union over `kind`. Derived from the map above so a new kind
 * cannot be half-registered.
 */
export type SimulatorNodeData = {
  [K in NodeKind]: { kind: K; config: NodeConfigByKind[K] };
}[NodeKind];

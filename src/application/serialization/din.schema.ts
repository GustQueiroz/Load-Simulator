import { z } from 'zod';

import { LOAD_BALANCING_ALGORITHMS } from '@/domain/nodes/config';

/**
 * `.din` — Distributed Infrastructure Network. Plain versioned JSON: it is
 * parsed, never evaluated, and a file is only ever applied to the app after
 * the *whole* document validates.
 */
export const DIN_SCHEMA_ID = 'system-design-simulator';
export const DIN_CURRENT_VERSION = 1;

const finite = z.number().finite();
const ratio = finite.min(0).max(1);
const latencyMs = finite.min(0).max(600_000);
const capacityRps = finite.min(1).max(10_000_000);
const rateRps = finite.min(0).max(10_000_000);
const count = finite.min(0).max(1_000_000_000);

const baseConfig = z.object({
  label: z.string().min(1).max(80),
  enabled: z.boolean(),
  baseLatencyMs: latencyMs,
  baseFailureRate: ratio,
});

const clientNode = z.object({
  kind: z.literal('client'),
  config: baseConfig.extend({ rps: rateRps }),
});

const loadBalancerNode = z.object({
  kind: z.literal('loadBalancer'),
  config: baseConfig.extend({
    capacityRps,
    algorithm: z.enum(LOAD_BALANCING_ALGORITHMS),
    weights: z.record(z.string(), finite.min(0).max(1_000)).default({}),
  }),
});

const apiGatewayNode = z.object({
  kind: z.literal('apiGateway'),
  config: baseConfig.extend({
    capacityRps,
    rateLimitRps: rateRps,
    authEnabled: z.boolean(),
    authLatencyMs: latencyMs,
  }),
});

const serverNode = z.object({
  kind: z.literal('server'),
  config: baseConfig.extend({
    capacityRps,
    instances: finite.int().min(1).max(1_000),
    maxQueueSize: count,
    timeoutMs: latencyMs,
  }),
});

const cacheNode = z.object({
  kind: z.literal('cache'),
  config: baseConfig.extend({
    capacityRps,
    hitRate: ratio,
    hitLatencyMs: latencyMs,
    missOverheadMs: latencyMs,
  }),
});

const messageQueueNode = z.object({
  kind: z.literal('messageQueue'),
  config: baseConfig.extend({
    ingressCapacityRps: capacityRps,
    deliveryCapacityRps: capacityRps,
    maxBacklog: count,
  }),
});

const databaseNode = z.object({
  kind: z.literal('database'),
  config: baseConfig.extend({
    capacityRps,
    maxConnections: finite.int().min(1).max(1_000_000),
    maxQueueSize: count,
    timeoutMs: latencyMs,
  }),
});

/**
 * Only configuration is persisted. Metrics and runtime (backlogs, timers) are
 * execution state — a `.din` describes a scenario, not a moment inside a run.
 */
export const dinNodeDataSchema = z.discriminatedUnion('kind', [
  clientNode,
  loadBalancerNode,
  apiGatewayNode,
  serverNode,
  cacheNode,
  messageQueueNode,
  databaseNode,
]);

export const dinNodeSchema = z.object({
  id: z.string().min(1),
  type: z.string().min(1),
  position: z.object({ x: finite, y: finite }),
  data: dinNodeDataSchema,
});

export const dinEdgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  sourceHandle: z.string().nullish(),
  targetHandle: z.string().nullish(),
  enabled: z.boolean().default(true),
});

export const dinFileSchema = z.object({
  schema: z.literal(DIN_SCHEMA_ID),
  version: z.number().int().positive(),
  metadata: z.object({
    name: z.string().min(1).max(120),
    createdAt: z.string(),
    updatedAt: z.string(),
    appVersion: z.string(),
  }),
  viewport: z.object({ x: finite, y: finite, zoom: finite.min(0.01).max(100) }),
  settings: z.object({
    cloud: z.enum(['generic', 'aws', 'gcp', 'azure']),
    tickMs: finite.min(16).max(5_000),
    presentationMode: z.boolean(),
  }),
  nodes: z.array(dinNodeSchema),
  edges: z.array(dinEdgeSchema),
});

export type DinFile = z.infer<typeof dinFileSchema>;
export type DinNode = z.infer<typeof dinNodeSchema>;
export type DinEdge = z.infer<typeof dinEdgeSchema>;

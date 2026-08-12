import { z } from 'zod';

import { CLIENT_TRAFFIC_MODES, LOAD_BALANCING_ALGORITHMS } from '@/domain/nodes/config';

export const DIN_SCHEMA_ID = 'system-design-simulator';
export const DIN_CURRENT_VERSION = 1;

const finite = z.number().finite();
const ratio = finite.min(0).max(1);
const latencyMs = finite.min(0).max(600_000);
const capacityRps = finite.min(1).max(10_000_000);
const rateRps = finite.min(0).max(10_000_000);
const count = finite.min(0).max(1_000_000_000);
const durationSeconds = finite.min(0).max(86_400);

/** Optional with a default: diagrams saved before fan-out was explicit still load. */
const fanout = z.enum(['broadcast', 'split']).default('broadcast');

const baseConfig = z.object({
  label: z.string().min(1).max(80),
  enabled: z.boolean(),
  baseLatencyMs: latencyMs,
  baseFailureRate: ratio,
});

const clientNode = z.object({
  kind: z.literal('client'),
  config: baseConfig.extend({
    fanout,
    rps: rateRps,
    retryEnabled: z.boolean().default(false),
    maxRetries: finite.int().min(0).max(5).default(2),
    trafficMode: z.enum(CLIENT_TRAFFIC_MODES).default('constant'),
    rampStartRps: rateRps.default(0),
    rampDurationSeconds: durationSeconds.default(10),
    spikePeakRps: rateRps.default(500),
    spikeAtSeconds: durationSeconds.default(5),
    spikeWidthSeconds: durationSeconds.default(2),
  }),
});

const buttonNode = z.object({
  kind: z.literal('button'),
  config: baseConfig.extend({
    fanout,
    requestsPerClick: finite.min(1).max(1_000_000),
    automatorRps: rateRps,
    rateLimitRps: rateRps,
    cooldownMs: latencyMs,
    maxPending: count.min(1),
  }),
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
    fanout,
    capacityRps,
    rateLimitRps: rateRps,
    authEnabled: z.boolean(),
    authLatencyMs: latencyMs,
  }),
});

const serverNode = z.object({
  kind: z.literal('server'),
  config: baseConfig.extend({
    fanout,
    capacityRps,
    instances: finite.int().min(1).max(1_000),
    maxQueueSize: count,
    timeoutMs: latencyMs,
  }),
});

const cacheNode = z.object({
  kind: z.literal('cache'),
  config: baseConfig.extend({
    fanout,
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
    fanout,
    capacityRps,
    maxConnections: finite.int().min(1).max(1_000_000),
    maxQueueSize: count,
    timeoutMs: latencyMs,
  }),
});

export const dinNodeDataSchema = z.discriminatedUnion('kind', [
  clientNode,
  buttonNode,
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

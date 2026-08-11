import type { NodeConfigByKind } from '@/domain/nodes/config';
import { createDefaultConfig } from '@/domain/nodes/defaults';
import type { DiagramEdge, DiagramNode, DiagramSnapshot } from '@/domain/diagram/diagram';
import type { NodeKind } from '@/domain/simulation/node-kind';

export const PRESET_IDS = [
  'load-balancer-basics',
  'single-server',
  'cache-relieves-database',
  'queue-absorbs-burst',
  'api-rate-limiting',
  'button-click-demo',
] as const;

export type PresetId = (typeof PRESET_IDS)[number];

export function isPresetId(value: string): value is PresetId {
  return (PRESET_IDS as readonly string[]).includes(value);
}

export type PresetTerm = NodeKind | 'producer' | 'worker';
export type PresetVocabulary = Record<PresetTerm, string>;

export interface ArchitecturePreset {
  id: PresetId;
  build: (vocabulary: PresetVocabulary) => DiagramSnapshot;
}

function node<K extends NodeKind>(
  id: string,
  kind: K,
  x: number,
  y: number,
  label: string,
  overrides: Partial<NodeConfigByKind[K]> = {},
): DiagramNode {
  const config = { ...createDefaultConfig(kind, label), ...overrides } as NodeConfigByKind[K];
  return { id, type: kind, position: { x, y }, data: { kind, config } as DiagramNode['data'] };
}

function edge(source: string, target: string): DiagramEdge {
  return { id: `e-${source}-${target}`, source, target, data: { enabled: true } };
}

const COL = 340;
const ROWS = [0, 320, 760, 1_200, 1_640] as const;

const col = (index: number) => index * COL;

const singleServer: ArchitecturePreset = {
  id: 'single-server',
  build: (v) => ({
    nodes: [
      node('client-1', 'client', col(1), ROWS[0], `${v.client} 1`, { rps: 150 }),
      node('server-1', 'server', col(1), ROWS[1], `${v.server} 1`, { capacityRps: 100 }),
      node('db-1', 'database', col(1), ROWS[2], `${v.database} 1`, { capacityRps: 200 }),
    ],
    edges: [edge('client-1', 'server-1'), edge('server-1', 'db-1')],
  }),
};

const loadBalancerBasics: ArchitecturePreset = {
  id: 'load-balancer-basics',
  build: (v) => ({
    nodes: [
      node('client-1', 'client', col(0.5), ROWS[0], `${v.client} 1`, { rps: 50 }),
      node('client-2', 'client', col(1.5), ROWS[0], `${v.client} 2`, { rps: 50 }),
      node('lb-1', 'loadBalancer', col(1), ROWS[1], `${v.loadBalancer} 1`, { capacityRps: 150 }),
      node('server-1', 'server', col(0), ROWS[2], `${v.server} 1`, { capacityRps: 100 }),
      node('server-2', 'server', col(1), ROWS[2], `${v.server} 2`, { capacityRps: 100 }),
      node('server-3', 'server', col(2), ROWS[2], `${v.server} 3`, { capacityRps: 100 }),
      node('db-1', 'database', col(1), ROWS[3], `${v.database} 1`, { capacityRps: 50 }),
    ],
    edges: [
      edge('client-1', 'lb-1'),
      edge('client-2', 'lb-1'),
      edge('lb-1', 'server-1'),
      edge('lb-1', 'server-2'),
      edge('lb-1', 'server-3'),
      edge('server-1', 'db-1'),
      edge('server-2', 'db-1'),
      edge('server-3', 'db-1'),
    ],
  }),
};

const cacheRelievesDatabase: ArchitecturePreset = {
  id: 'cache-relieves-database',
  build: (v) => ({
    nodes: [
      node('client-1', 'client', col(1), ROWS[0], `${v.client} 1`, { rps: 1_000 }),
      node('lb-1', 'loadBalancer', col(1), ROWS[1], `${v.loadBalancer} 1`, { capacityRps: 5_000 }),
      node('server-1', 'server', col(0.5), ROWS[2], `${v.server} 1`, { capacityRps: 900 }),
      node('server-2', 'server', col(1.5), ROWS[2], `${v.server} 2`, { capacityRps: 900 }),
      node('cache-1', 'cache', col(1), ROWS[3], `${v.cache} 1`, { hitRate: 0.9 }),
      node('db-1', 'database', col(1), ROWS[4], `${v.database} 1`, { capacityRps: 200 }),
    ],
    edges: [
      edge('client-1', 'lb-1'),
      edge('lb-1', 'server-1'),
      edge('lb-1', 'server-2'),
      edge('server-1', 'cache-1'),
      edge('server-2', 'cache-1'),
      edge('cache-1', 'db-1'),
    ],
  }),
};

const queueAbsorbsBurst: ArchitecturePreset = {
  id: 'queue-absorbs-burst',
  build: (v) => ({
    nodes: [
      node('client-1', 'client', col(1), ROWS[0], v.producer, { rps: 1_000 }),
      node('queue-1', 'messageQueue', col(1), ROWS[1], `${v.messageQueue} 1`, {
        deliveryCapacityRps: 200,
      }),
      node('server-1', 'server', col(1), ROWS[2], `${v.worker} 1`, { capacityRps: 250 }),
      node('db-1', 'database', col(1), ROWS[3], `${v.database} 1`, { capacityRps: 400 }),
    ],
    edges: [edge('client-1', 'queue-1'), edge('queue-1', 'server-1'), edge('server-1', 'db-1')],
  }),
};

const rateLimiting: ArchitecturePreset = {
  id: 'api-rate-limiting',
  build: (v) => ({
    nodes: [
      node('client-1', 'client', col(1), ROWS[0], `${v.client} 1`, { rps: 5_000 }),
      node('gateway-1', 'apiGateway', col(1), ROWS[1], `${v.apiGateway} 1`, {
        rateLimitRps: 1_000,
        capacityRps: 10_000,
      }),
      node('server-1', 'server', col(1), ROWS[2], `${v.server} 1`, { capacityRps: 1_500 }),
      node('db-1', 'database', col(1), ROWS[3], `${v.database} 1`, { capacityRps: 2_000 }),
    ],
    edges: [
      edge('client-1', 'gateway-1'),
      edge('gateway-1', 'server-1'),
      edge('server-1', 'db-1'),
    ],
  }),
};

const buttonClickDemo: ArchitecturePreset = {
  id: 'button-click-demo',
  build: (v) => ({
    nodes: [
      node('button-1', 'button', col(1), ROWS[0], `${v.button} 1`, {
        requestsPerClick: 1,
        automatorRps: 0,
        rateLimitRps: 20,
        cooldownMs: 200,
        maxPending: 100,
      }),
      node('server-1', 'server', col(1), ROWS[1], `${v.server} 1`, {
        capacityRps: 50,
        maxQueueSize: 200,
      }),
      node('db-1', 'database', col(1), ROWS[2], `${v.database} 1`, {
        capacityRps: 30,
        maxConnections: 40,
      }),
    ],
    edges: [edge('button-1', 'server-1'), edge('server-1', 'db-1')],
  }),
};

export const PRESETS: readonly ArchitecturePreset[] = [
  loadBalancerBasics,
  singleServer,
  cacheRelievesDatabase,
  queueAbsorbsBurst,
  rateLimiting,
  buttonClickDemo,
];

export const DEFAULT_PRESET_ID: PresetId = loadBalancerBasics.id;

export function presetById(id: string): ArchitecturePreset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}

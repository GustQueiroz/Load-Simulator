import type { LessonDefinition } from '../types';
import { col, lessonEdge, lessonNode, ROWS } from '../build-helpers';

const TRAFFIC_LOCK = { trafficSources: true } as const;

const healthy = (seconds: number, condition: LessonDefinition['win']): LessonDefinition['win'] => ({
  type: 'and',
  conditions: [
    { type: 'flag', flag: 'started' },
    { type: 'elapsed', op: 'gte', seconds },
    {
      type: 'sustained',
      seconds: Math.min(5, seconds),
      condition,
    },
  ],
});

/** Lovelace — missões: estrutura pronta, tráfego travado, sem balões. */
export const WORLD_2_LESSONS: readonly LessonDefinition[] = [
  {
    id: '2.1',
    worldId: '2',
    order: 1,
    minutes: 8,
    mode: 'mission',
    autoStart: true,
    locks: TRAFFIC_LOCK,
    budgetMonthlyUsd: 220,
    // Cache exists but servers talk straight to the DB — classic miswire.
    build: (v) => ({
      nodes: [
        lessonNode('client-1', 'client', col(1), ROWS[0], `${v.client} 1`, { rps: 900 }),
        lessonNode('lb-1', 'loadBalancer', col(1), ROWS[1], `${v.loadBalancer} 1`, {
          capacityRps: 5_000,
        }),
        lessonNode('server-1', 'server', col(0.5), ROWS[2], `${v.server} 1`, { capacityRps: 600 }),
        lessonNode('server-2', 'server', col(1.5), ROWS[2], `${v.server} 2`, { capacityRps: 600 }),
        lessonNode('cache-1', 'cache', col(2.2), ROWS[3], `${v.cache} 1`, { hitRate: 0.9 }),
        lessonNode('db-1', 'database', col(1), ROWS[4], `${v.database} 1`, { capacityRps: 180 }),
      ],
      edges: [
        lessonEdge('client-1', 'lb-1'),
        lessonEdge('lb-1', 'server-1'),
        lessonEdge('lb-1', 'server-2'),
        lessonEdge('server-1', 'db-1'),
        lessonEdge('server-2', 'db-1'),
      ],
    }),
    balloons: [],
    win: healthy(6, {
      type: 'and',
      conditions: [
        { type: 'node-utilization', nodeId: 'db-1', op: 'lt', value: 0.75 },
        { type: 'failure-ratio', op: 'lt', value: 0.08 },
      ],
    }),
    stars: {
      two: { type: 'node-utilization', nodeId: 'db-1', op: 'lt', value: 0.55 },
      three: {
        type: 'and',
        conditions: [
          { type: 'node-utilization', nodeId: 'db-1', op: 'lt', value: 0.45 },
          { type: 'monthly-cost', op: 'lte', value: 220 },
        ],
      },
    },
  },
  {
    id: '2.2',
    worldId: '2',
    order: 2,
    minutes: 8,
    mode: 'mission',
    autoStart: true,
    locks: TRAFFIC_LOCK,
    build: (v) => ({
      nodes: [
        lessonNode('client-1', 'client', col(1), ROWS[0], `${v.client} 1`, { rps: 120 }),
        lessonNode('lb-1', 'loadBalancer', col(1), ROWS[1], `${v.loadBalancer} 1`, {
          capacityRps: 500,
          algorithm: 'roundRobin',
        }),
        lessonNode('server-1', 'server', col(0.4), ROWS[2], `${v.server} 1`, { capacityRps: 100 }),
        lessonNode('server-2', 'server', col(1.6), ROWS[2], `${v.server} 2`, { capacityRps: 35 }),
        lessonNode('db-1', 'database', col(1), ROWS[3], `${v.database} 1`, { capacityRps: 400 }),
      ],
      edges: [
        lessonEdge('client-1', 'lb-1'),
        lessonEdge('lb-1', 'server-1'),
        lessonEdge('lb-1', 'server-2'),
        lessonEdge('server-1', 'db-1'),
        lessonEdge('server-2', 'db-1'),
      ],
    }),
    balloons: [],
    win: healthy(6, {
      type: 'and',
      conditions: [
        { type: 'node-utilization', nodeId: 'server-1', op: 'lt', value: 0.95 },
        { type: 'node-utilization', nodeId: 'server-2', op: 'lt', value: 0.95 },
        { type: 'no-status', status: 'critical' },
      ],
    }),
    stars: {
      two: {
        type: 'and',
        conditions: [
          { type: 'node-utilization', nodeId: 'server-1', op: 'lt', value: 0.8 },
          { type: 'node-utilization', nodeId: 'server-2', op: 'lt', value: 0.8 },
        ],
      },
      three: { type: 'failure-ratio', op: 'lt', value: 0.02 },
    },
  },
  {
    id: '2.3',
    worldId: '2',
    order: 3,
    minutes: 10,
    mode: 'mission',
    autoStart: true,
    locks: TRAFFIC_LOCK,
    build: (v) => ({
      nodes: [
        lessonNode('client-1', 'client', col(1), ROWS[0], v.producer, {
          rps: 250,
          trafficMode: 'spike',
          spikePeakRps: 2_200,
          spikeAtSeconds: 3,
          spikeWidthSeconds: 4,
        }),
        lessonNode('server-1', 'server', col(1), ROWS[1], `${v.worker} 1`, { capacityRps: 280 }),
        lessonNode('db-1', 'database', col(1), ROWS[2], `${v.database} 1`, { capacityRps: 450 }),
      ],
      edges: [lessonEdge('client-1', 'server-1'), lessonEdge('server-1', 'db-1')],
    }),
    balloons: [],
    win: {
      type: 'and',
      conditions: [
        { type: 'flag', flag: 'started' },
        { type: 'elapsed', op: 'gte', seconds: 12 },
        { type: 'has-kind', kind: 'messageQueue' },
        {
          type: 'sustained',
          seconds: 4,
          condition: {
            type: 'and',
            conditions: [
              { type: 'failure-ratio', op: 'lt', value: 0.1 },
              { type: 'node-utilization', nodeId: 'server-1', op: 'lt', value: 0.9 },
            ],
          },
        },
      ],
    },
    stars: {
      two: { type: 'failure-ratio', op: 'lt', value: 0.05 },
      three: { type: 'failure-ratio', op: 'lt', value: 0.02 },
    },
  },
  {
    id: '2.4',
    worldId: '2',
    order: 4,
    minutes: 10,
    mode: 'mission',
    autoStart: true,
    locks: TRAFFIC_LOCK,
    budgetMonthlyUsd: 260,
    build: (v) => ({
      nodes: [
        lessonNode('client-1', 'client', col(1), ROWS[0], `${v.client} 1`, { rps: 3_200 }),
        lessonNode('gateway-1', 'apiGateway', col(1), ROWS[1], `${v.apiGateway} 1`, {
          rateLimitRps: 8_000,
          capacityRps: 10_000,
        }),
        lessonNode('server-1', 'server', col(1), ROWS[2], `${v.server} 1`, { capacityRps: 900 }),
        lessonNode('db-1', 'database', col(1), ROWS[3], `${v.database} 1`, { capacityRps: 160 }),
      ],
      edges: [
        lessonEdge('client-1', 'gateway-1'),
        lessonEdge('gateway-1', 'server-1'),
        lessonEdge('server-1', 'db-1'),
      ],
    }),
    balloons: [],
    win: healthy(7, {
      type: 'and',
      conditions: [
        { type: 'node-utilization', nodeId: 'db-1', op: 'lt', value: 0.8 },
        { type: 'node-utilization', nodeId: 'server-1', op: 'lt', value: 0.9 },
        { type: 'completion-ratio', op: 'gte', value: 0.35 },
      ],
    }),
    stars: {
      two: { type: 'failure-ratio', op: 'lt', value: 0.55 },
      three: {
        type: 'and',
        conditions: [
          { type: 'node-utilization', nodeId: 'db-1', op: 'lt', value: 0.6 },
          { type: 'monthly-cost', op: 'lte', value: 260 },
        ],
      },
    },
  },
  {
    id: '2.5',
    worldId: '2',
    order: 5,
    minutes: 8,
    mode: 'mission',
    autoStart: true,
    locks: {
      trafficSources: true,
    },
    build: (v) => ({
      nodes: [
        lessonNode('button-1', 'button', col(1), ROWS[0], `${v.button} 1`, {
          requestsPerClick: 1,
          automatorRps: 35,
          rateLimitRps: 500,
          cooldownMs: 0,
          maxPending: 400,
        }),
        lessonNode('server-1', 'server', col(1), ROWS[1], `${v.server} 1`, {
          capacityRps: 80,
          maxQueueSize: 120,
        }),
        lessonNode('db-1', 'database', col(1), ROWS[2], `${v.database} 1`, {
          capacityRps: 40,
          maxConnections: 50,
        }),
      ],
      edges: [lessonEdge('button-1', 'server-1'), lessonEdge('server-1', 'db-1')],
    }),
    balloons: [],
    win: healthy(6, {
      type: 'and',
      conditions: [
        { type: 'node-utilization', nodeId: 'db-1', op: 'lt', value: 0.85 },
        { type: 'no-status', status: 'critical' },
      ],
    }),
    stars: {
      two: { type: 'failure-ratio', op: 'lt', value: 0.1 },
      three: { type: 'node-utilization', nodeId: 'db-1', op: 'lt', value: 0.65 },
    },
  },
];

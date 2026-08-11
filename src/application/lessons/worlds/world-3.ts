import type { LessonDefinition } from '../types';
import { col, lessonEdge, lessonNode, ROWS } from '../build-helpers';

const TRAFFIC_LOCK = { trafficSources: true } as const;

/** Dijkstra — chefes: briefing duro, orçamento, sem gabarito. */
export const WORLD_3_LESSONS: readonly LessonDefinition[] = [
  {
    id: '3.1',
    worldId: '3',
    order: 1,
    minutes: 12,
    mode: 'mission',
    autoStart: true,
    locks: TRAFFIC_LOCK,
    budgetMonthlyUsd: 240,
    build: (v) => ({
      nodes: [
        lessonNode('client-1', 'client', col(1), ROWS[0], `${v.client} 1`, {
          rps: 400,
          trafficMode: 'spike',
          spikePeakRps: 3_500,
          spikeAtSeconds: 4,
          spikeWidthSeconds: 5,
        }),
        lessonNode('server-1', 'server', col(1), ROWS[1], `${v.server} 1`, {
          capacityRps: 220,
          instances: 1,
          maxQueueSize: 80,
        }),
        lessonNode('db-1', 'database', col(1), ROWS[2], `${v.database} 1`, { capacityRps: 120 }),
      ],
      edges: [lessonEdge('client-1', 'server-1'), lessonEdge('server-1', 'db-1')],
    }),
    balloons: [],
    win: {
      type: 'and',
      conditions: [
        { type: 'flag', flag: 'started' },
        { type: 'elapsed', op: 'gte', seconds: 14 },
        {
          type: 'sustained',
          seconds: 5,
          condition: {
            type: 'and',
            conditions: [
              { type: 'failure-ratio', op: 'lt', value: 0.12 },
              { type: 'completion-ratio', op: 'gte', value: 0.55 },
            ],
          },
        },
        { type: 'monthly-cost', op: 'lte', value: 240 },
      ],
    },
    stars: {
      two: { type: 'failure-ratio', op: 'lt', value: 0.06 },
      three: {
        type: 'and',
        conditions: [
          { type: 'failure-ratio', op: 'lt', value: 0.04 },
          { type: 'monthly-cost', op: 'lte', value: 200 },
        ],
      },
    },
  },
  {
    id: '3.2',
    worldId: '3',
    order: 2,
    minutes: 12,
    mode: 'mission',
    autoStart: true,
    locks: {
      trafficSources: true,
      kinds: {
        database: ['capacityRps', 'maxConnections', 'maxQueueSize', 'timeoutMs', 'instances'],
      },
      nodes: {
        'db-1': '*',
      },
    },
    budgetMonthlyUsd: 280,
    build: (v) => ({
      nodes: [
        lessonNode('client-1', 'client', col(1), ROWS[0], `${v.client} 1`, { rps: 1_600 }),
        lessonNode('lb-1', 'loadBalancer', col(1), ROWS[1], `${v.loadBalancer} 1`, {
          capacityRps: 5_000,
        }),
        lessonNode('server-1', 'server', col(0.4), ROWS[2], `${v.server} 1`, {
          capacityRps: 700,
          instances: 2,
        }),
        lessonNode('server-2', 'server', col(1.6), ROWS[2], `${v.server} 2`, {
          capacityRps: 700,
          instances: 2,
        }),
        lessonNode('db-1', 'database', col(1), ROWS[3], `${v.database} 1`, { capacityRps: 140 }),
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
    win: {
      type: 'and',
      conditions: [
        { type: 'flag', flag: 'started' },
        { type: 'elapsed', op: 'gte', seconds: 8 },
        {
          type: 'sustained',
          seconds: 5,
          condition: {
            type: 'and',
            conditions: [
              { type: 'node-utilization', nodeId: 'db-1', op: 'lt', value: 0.8 },
              { type: 'failure-ratio', op: 'lt', value: 0.1 },
              { type: 'completion-ratio', op: 'gte', value: 0.5 },
            ],
          },
        },
      ],
    },
    stars: {
      two: { type: 'node-utilization', nodeId: 'db-1', op: 'lt', value: 0.6 },
      three: {
        type: 'and',
        conditions: [
          { type: 'node-utilization', nodeId: 'db-1', op: 'lt', value: 0.5 },
          { type: 'monthly-cost', op: 'lte', value: 280 },
        ],
      },
    },
  },
  {
    id: '3.3',
    worldId: '3',
    order: 3,
    minutes: 15,
    mode: 'mission',
    autoStart: true,
    locks: TRAFFIC_LOCK,
    budgetMonthlyUsd: 200,
    // Over-provisioned and expensive but healthy — slim it down without breaking SLA.
    build: (v) => ({
      nodes: [
        lessonNode('client-1', 'client', col(1), ROWS[0], `${v.client} 1`, { rps: 500 }),
        lessonNode('lb-1', 'loadBalancer', col(1), ROWS[1], `${v.loadBalancer} 1`, {
          capacityRps: 8_000,
        }),
        lessonNode('server-1', 'server', col(0), ROWS[2], `${v.server} 1`, {
          capacityRps: 400,
          instances: 4,
        }),
        lessonNode('server-2', 'server', col(1), ROWS[2], `${v.server} 2`, {
          capacityRps: 400,
          instances: 4,
        }),
        lessonNode('server-3', 'server', col(2), ROWS[2], `${v.server} 3`, {
          capacityRps: 400,
          instances: 4,
        }),
        lessonNode('cache-1', 'cache', col(1), ROWS[3], `${v.cache} 1`, { hitRate: 0.95 }),
        lessonNode('db-1', 'database', col(1), ROWS[4], `${v.database} 1`, { capacityRps: 800 }),
      ],
      edges: [
        lessonEdge('client-1', 'lb-1'),
        lessonEdge('lb-1', 'server-1'),
        lessonEdge('lb-1', 'server-2'),
        lessonEdge('lb-1', 'server-3'),
        lessonEdge('server-1', 'cache-1'),
        lessonEdge('server-2', 'cache-1'),
        lessonEdge('server-3', 'cache-1'),
        lessonEdge('cache-1', 'db-1'),
      ],
    }),
    balloons: [],
    win: {
      type: 'and',
      conditions: [
        { type: 'flag', flag: 'started' },
        { type: 'elapsed', op: 'gte', seconds: 8 },
        {
          type: 'sustained',
          seconds: 5,
          condition: {
            type: 'and',
            conditions: [
              { type: 'failure-ratio', op: 'lt', value: 0.05 },
              { type: 'completion-ratio', op: 'gte', value: 0.85 },
              { type: 'no-status', status: 'critical' },
            ],
          },
        },
        { type: 'monthly-cost', op: 'lte', value: 200 },
      ],
    },
    stars: {
      two: { type: 'monthly-cost', op: 'lte', value: 170 },
      three: { type: 'monthly-cost', op: 'lte', value: 140 },
    },
  },
  {
    id: '3.4',
    worldId: '3',
    order: 4,
    minutes: 15,
    mode: 'mission',
    autoStart: true,
    locks: TRAFFIC_LOCK,
    budgetMonthlyUsd: 260,
    // Only the traffic source — build the rest.
    build: (v) => ({
      nodes: [
        lessonNode('client-1', 'client', col(1), ROWS[0], `${v.client} 1`, {
          rps: 800,
          trafficMode: 'ramp',
          rampStartRps: 100,
          rampDurationSeconds: 8,
        }),
      ],
      edges: [],
    }),
    balloons: [],
    win: {
      type: 'and',
      conditions: [
        { type: 'flag', flag: 'started' },
        { type: 'elapsed', op: 'gte', seconds: 12 },
        { type: 'has-kind', kind: 'server' },
        { type: 'has-kind', kind: 'database' },
        {
          type: 'sustained',
          seconds: 5,
          condition: {
            type: 'and',
            conditions: [
              { type: 'failure-ratio', op: 'lt', value: 0.08 },
              { type: 'completion-ratio', op: 'gte', value: 0.7 },
            ],
          },
        },
        { type: 'monthly-cost', op: 'lte', value: 260 },
      ],
    },
    stars: {
      two: {
        type: 'and',
        conditions: [
          { type: 'failure-ratio', op: 'lt', value: 0.04 },
          { type: 'monthly-cost', op: 'lte', value: 220 },
        ],
      },
      three: {
        type: 'and',
        conditions: [
          { type: 'failure-ratio', op: 'lt', value: 0.02 },
          { type: 'no-status', status: 'critical' },
          { type: 'monthly-cost', op: 'lte', value: 190 },
        ],
      },
    },
  },
];

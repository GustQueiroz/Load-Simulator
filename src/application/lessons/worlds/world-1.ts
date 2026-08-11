import type { LessonDefinition } from '../types';
import { col, lessonEdge, lessonNode, ROWS } from '../build-helpers';

export const WORLD_1_LESSONS: readonly LessonDefinition[] = [
  {
    id: '1.1',
    worldId: '1',
    order: 1,
    minutes: 5,
    mode: 'guided',
    focusNodeId: 'client-1',
    build: (v) => ({
      nodes: [
        lessonNode('client-1', 'client', col(1), ROWS[0], `${v.client} 1`, { rps: 60 }),
        lessonNode('server-1', 'server', col(1), ROWS[1], `${v.server} 1`, { capacityRps: 100 }),
        lessonNode('db-1', 'database', col(1), ROWS[2], `${v.database} 1`, { capacityRps: 400 }),
      ],
      edges: [lessonEdge('client-1', 'server-1'), lessonEdge('server-1', 'db-1')],
    }),
    win: {
      type: 'and',
      conditions: [
        { type: 'flag', flag: 'started' },
        { type: 'node-status', nodeId: 'server-1', status: 'critical' },
        { type: 'node-utilization', nodeId: 'db-1', op: 'lt', value: 0.6 },
      ],
    },
    balloons: [
      {
        id: 'start',
        titleKey: 'lesson.1.1.balloon.start.title',
        bodyKey: 'lesson.1.1.balloon.start.body',
        anchor: { type: 'toolbar', target: 'start' },
        advanceWhen: { type: 'flag', flag: 'started' },
      },
      {
        id: 'raise',
        titleKey: 'lesson.1.1.balloon.raise.title',
        bodyKey: 'lesson.1.1.balloon.raise.body',
        anchor: { type: 'field', nodeId: 'client-1', field: 'rps' },
        advanceWhen: { type: 'node-status', nodeId: 'server-1', status: 'critical' },
      },
      {
        id: 'compare',
        titleKey: 'lesson.1.1.balloon.compare.title',
        bodyKey: 'lesson.1.1.balloon.compare.body',
        anchor: { type: 'node', nodeId: 'db-1' },
        advanceWhen: {
          type: 'and',
          conditions: [
            { type: 'node-status', nodeId: 'server-1', status: 'critical' },
            { type: 'node-utilization', nodeId: 'db-1', op: 'lt', value: 0.6 },
          ],
        },
      },
    ],
  },
  {
    id: '1.2',
    worldId: '1',
    order: 2,
    minutes: 6,
    mode: 'guided',
    focusNodeId: 'db-1',
    autoStart: true,
    build: (v) => ({
      nodes: [
        lessonNode('client-1', 'client', col(0.5), ROWS[0], `${v.client} 1`, { rps: 50 }),
        lessonNode('client-2', 'client', col(1.5), ROWS[0], `${v.client} 2`, { rps: 50 }),
        lessonNode('lb-1', 'loadBalancer', col(1), ROWS[1], `${v.loadBalancer} 1`, {
          capacityRps: 150,
        }),
        lessonNode('server-1', 'server', col(0), ROWS[2], `${v.server} 1`, { capacityRps: 100 }),
        lessonNode('server-2', 'server', col(1), ROWS[2], `${v.server} 2`, { capacityRps: 100 }),
        lessonNode('server-3', 'server', col(2), ROWS[2], `${v.server} 3`, { capacityRps: 100 }),
        lessonNode('db-1', 'database', col(1), ROWS[3], `${v.database} 1`, { capacityRps: 50 }),
      ],
      edges: [
        lessonEdge('client-1', 'lb-1'),
        lessonEdge('client-2', 'lb-1'),
        lessonEdge('lb-1', 'server-1'),
        lessonEdge('lb-1', 'server-2'),
        lessonEdge('lb-1', 'server-3'),
        lessonEdge('server-1', 'db-1'),
        lessonEdge('server-2', 'db-1'),
        lessonEdge('server-3', 'db-1'),
      ],
    }),
    win: {
      type: 'and',
      conditions: [
        { type: 'flag', flag: 'started' },
        { type: 'bottleneck', nodeId: 'db-1' },
        { type: 'node-status', nodeId: 'server-1', status: 'normal' },
      ],
    },
    balloons: [
      {
        id: 'look',
        titleKey: 'lesson.1.2.balloon.look.title',
        bodyKey: 'lesson.1.2.balloon.look.body',
        anchor: { type: 'node', nodeId: 'server-2' },
        advanceWhen: {
          type: 'and',
          conditions: [
            { type: 'tick', op: 'gte', value: 5 },
            { type: 'node-status', nodeId: 'server-1', status: 'normal' },
          ],
        },
      },
      {
        id: 'db',
        titleKey: 'lesson.1.2.balloon.db.title',
        bodyKey: 'lesson.1.2.balloon.db.body',
        anchor: { type: 'node', nodeId: 'db-1' },
        advanceWhen: { type: 'bottleneck', nodeId: 'db-1' },
      },
      {
        id: 'lesson',
        titleKey: 'lesson.1.2.balloon.lesson.title',
        bodyKey: 'lesson.1.2.balloon.lesson.body',
        anchor: { type: 'panel', target: 'system' },
        advanceWhen: { type: 'bottleneck', nodeId: 'db-1' },
      },
    ],
  },
  {
    id: '1.3',
    worldId: '1',
    order: 3,
    minutes: 7,
    mode: 'guided',
    focusNodeId: 'cache-1',
    autoStart: true,
    build: (v) => ({
      nodes: [
        lessonNode('client-1', 'client', col(1), ROWS[0], `${v.client} 1`, { rps: 1_000 }),
        lessonNode('lb-1', 'loadBalancer', col(1), ROWS[1], `${v.loadBalancer} 1`, {
          capacityRps: 5_000,
        }),
        lessonNode('server-1', 'server', col(0.5), ROWS[2], `${v.server} 1`, { capacityRps: 900 }),
        lessonNode('server-2', 'server', col(1.5), ROWS[2], `${v.server} 2`, { capacityRps: 900 }),
        lessonNode('cache-1', 'cache', col(1), ROWS[3], `${v.cache} 1`, { hitRate: 0.5 }),
        lessonNode('db-1', 'database', col(1), ROWS[4], `${v.database} 1`, { capacityRps: 200 }),
      ],
      edges: [
        lessonEdge('client-1', 'lb-1'),
        lessonEdge('lb-1', 'server-1'),
        lessonEdge('lb-1', 'server-2'),
        lessonEdge('server-1', 'cache-1'),
        lessonEdge('server-2', 'cache-1'),
        lessonEdge('cache-1', 'db-1'),
      ],
    }),
    win: {
      type: 'and',
      conditions: [
        { type: 'flag', flag: 'started' },
        { type: 'config-number', nodeId: 'cache-1', key: 'hitRate', op: 'gte', value: 0.85 },
        { type: 'node-utilization', nodeId: 'db-1', op: 'lt', value: 0.6 },
      ],
    },
    balloons: [
      {
        id: 'pain',
        titleKey: 'lesson.1.3.balloon.pain.title',
        bodyKey: 'lesson.1.3.balloon.pain.body',
        anchor: { type: 'node', nodeId: 'db-1' },
        advanceWhen: {
          type: 'and',
          conditions: [
            { type: 'tick', op: 'gte', value: 5 },
            { type: 'node-utilization', nodeId: 'db-1', op: 'gte', value: 0.8 },
          ],
        },
      },
      {
        id: 'raise',
        titleKey: 'lesson.1.3.balloon.raise.title',
        bodyKey: 'lesson.1.3.balloon.raise.body',
        anchor: { type: 'field', nodeId: 'cache-1', field: 'hitRate' },
        advanceWhen: {
          type: 'config-number',
          nodeId: 'cache-1',
          key: 'hitRate',
          op: 'gte',
          value: 0.85,
        },
      },
      {
        id: 'relief',
        titleKey: 'lesson.1.3.balloon.relief.title',
        bodyKey: 'lesson.1.3.balloon.relief.body',
        anchor: { type: 'node', nodeId: 'db-1' },
        advanceWhen: { type: 'node-utilization', nodeId: 'db-1', op: 'lt', value: 0.6 },
      },
    ],
  },
  {
    id: '1.4',
    worldId: '1',
    order: 4,
    minutes: 6,
    mode: 'guided',
    focusNodeId: 'gateway-1',
    autoStart: true,
    build: (v) => ({
      nodes: [
        lessonNode('client-1', 'client', col(1), ROWS[0], `${v.client} 1`, { rps: 5_000 }),
        lessonNode('gateway-1', 'apiGateway', col(1), ROWS[1], `${v.apiGateway} 1`, {
          rateLimitRps: 5_000,
          capacityRps: 10_000,
        }),
        lessonNode('server-1', 'server', col(1), ROWS[2], `${v.server} 1`, { capacityRps: 1_500 }),
        lessonNode('db-1', 'database', col(1), ROWS[3], `${v.database} 1`, { capacityRps: 2_000 }),
      ],
      edges: [
        lessonEdge('client-1', 'gateway-1'),
        lessonEdge('gateway-1', 'server-1'),
        lessonEdge('server-1', 'db-1'),
      ],
    }),
    win: {
      type: 'and',
      conditions: [
        { type: 'flag', flag: 'started' },
        { type: 'node-utilization', nodeId: 'server-1', op: 'lt', value: 0.8 },
        { type: 'node-metric', nodeId: 'gateway-1', metric: 'droppedRps', op: 'gt', value: 0 },
      ],
    },
    balloons: [
      {
        id: 'overload',
        titleKey: 'lesson.1.4.balloon.overload.title',
        bodyKey: 'lesson.1.4.balloon.overload.body',
        anchor: { type: 'node', nodeId: 'server-1' },
        advanceWhen: {
          type: 'and',
          conditions: [
            { type: 'tick', op: 'gte', value: 5 },
            { type: 'node-utilization', nodeId: 'server-1', op: 'gte', value: 0.8 },
          ],
        },
      },
      {
        id: 'limit',
        titleKey: 'lesson.1.4.balloon.limit.title',
        bodyKey: 'lesson.1.4.balloon.limit.body',
        anchor: { type: 'field', nodeId: 'gateway-1', field: 'rateLimitRps' },
        advanceWhen: {
          type: 'config-number',
          nodeId: 'gateway-1',
          key: 'rateLimitRps',
          op: 'lte',
          value: 1_200,
        },
      },
      {
        id: 'safe',
        titleKey: 'lesson.1.4.balloon.safe.title',
        bodyKey: 'lesson.1.4.balloon.safe.body',
        anchor: { type: 'node', nodeId: 'gateway-1' },
        advanceWhen: {
          type: 'and',
          conditions: [
            { type: 'node-utilization', nodeId: 'server-1', op: 'lt', value: 0.8 },
            { type: 'node-metric', nodeId: 'gateway-1', metric: 'droppedRps', op: 'gt', value: 0 },
          ],
        },
      },
    ],
  },
  {
    id: '1.5',
    worldId: '1',
    order: 5,
    minutes: 7,
    mode: 'guided',
    focusNodeId: 'queue-1',
    autoStart: true,
    build: (v) => ({
      nodes: [
        lessonNode('client-1', 'client', col(1), ROWS[0], v.producer, {
          rps: 200,
          trafficMode: 'spike',
          spikePeakRps: 2_000,
          spikeAtSeconds: 2,
          spikeWidthSeconds: 3,
        }),
        lessonNode('queue-1', 'messageQueue', col(1), ROWS[1], `${v.messageQueue} 1`, {
          deliveryCapacityRps: 200,
        }),
        lessonNode('server-1', 'server', col(1), ROWS[2], `${v.worker} 1`, { capacityRps: 250 }),
        lessonNode('db-1', 'database', col(1), ROWS[3], `${v.database} 1`, { capacityRps: 400 }),
      ],
      edges: [
        lessonEdge('client-1', 'queue-1'),
        lessonEdge('queue-1', 'server-1'),
        lessonEdge('server-1', 'db-1'),
      ],
    }),
    win: {
      type: 'and',
      conditions: [
        { type: 'flag', flag: 'started' },
        { type: 'flag', flag: 'sawQueueDepth' },
        { type: 'elapsed', op: 'gte', seconds: 8 },
        { type: 'node-utilization', nodeId: 'server-1', op: 'lt', value: 0.8 },
      ],
    },
    balloons: [
      {
        id: 'spike',
        titleKey: 'lesson.1.5.balloon.spike.title',
        bodyKey: 'lesson.1.5.balloon.spike.body',
        anchor: { type: 'node', nodeId: 'client-1' },
        advanceWhen: { type: 'elapsed', op: 'gte', seconds: 3 },
      },
      {
        id: 'backlog',
        titleKey: 'lesson.1.5.balloon.backlog.title',
        bodyKey: 'lesson.1.5.balloon.backlog.body',
        anchor: { type: 'node', nodeId: 'queue-1' },
        advanceWhen: { type: 'flag', flag: 'sawQueueDepth' },
      },
      {
        id: 'drain',
        titleKey: 'lesson.1.5.balloon.drain.title',
        bodyKey: 'lesson.1.5.balloon.drain.body',
        anchor: { type: 'node', nodeId: 'server-1' },
        advanceWhen: {
          type: 'and',
          conditions: [
            { type: 'elapsed', op: 'gte', seconds: 8 },
            { type: 'node-utilization', nodeId: 'server-1', op: 'lt', value: 0.8 },
          ],
        },
      },
    ],
  },
];

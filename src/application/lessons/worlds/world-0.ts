import type { LessonDefinition } from '../types';
import { col, lessonEdge, lessonNode, ROWS } from '../build-helpers';

export const WORLD_0_LESSONS: readonly LessonDefinition[] = [
  {
    id: '0.1',
    worldId: '0',
    order: 1,
    minutes: 3,
    mode: 'guided',
    focusNodeId: 'server-1',
    build: (v) => ({
      nodes: [
        lessonNode('client-1', 'client', col(1), ROWS[0], `${v.client} 1`, { rps: 150 }),
        lessonNode('server-1', 'server', col(1), ROWS[1], `${v.server} 1`, { capacityRps: 100 }),
        lessonNode('db-1', 'database', col(1), ROWS[2], `${v.database} 1`, { capacityRps: 200 }),
      ],
      edges: [lessonEdge('client-1', 'server-1'), lessonEdge('server-1', 'db-1')],
    }),
    win: {
      type: 'and',
      conditions: [
        { type: 'flag', flag: 'started' },
        { type: 'flag', flag: 'paused' },
        { type: 'has-bottleneck' },
      ],
    },
    balloons: [
      {
        id: 'play',
        titleKey: 'lesson.0.1.balloon.play.title',
        bodyKey: 'lesson.0.1.balloon.play.body',
        anchor: { type: 'toolbar', target: 'start' },
        advanceWhen: { type: 'flag', flag: 'started' },
      },
      {
        id: 'bottleneck',
        titleKey: 'lesson.0.1.balloon.bottleneck.title',
        bodyKey: 'lesson.0.1.balloon.bottleneck.body',
        anchor: { type: 'panel', target: 'system' },
        advanceWhen: { type: 'has-bottleneck' },
      },
      {
        id: 'pause',
        titleKey: 'lesson.0.1.balloon.pause.title',
        bodyKey: 'lesson.0.1.balloon.pause.body',
        anchor: { type: 'toolbar', target: 'start' },
        advanceWhen: { type: 'flag', flag: 'paused' },
      },
    ],
  },
  {
    id: '0.2',
    worldId: '0',
    order: 2,
    minutes: 4,
    mode: 'guided',
    focusNodeId: 'client-1',
    build: (v) => ({
      nodes: [
        lessonNode('client-1', 'client', col(1), ROWS[0], `${v.client} 1`, { rps: 40 }),
        lessonNode('server-1', 'server', col(1), ROWS[1], `${v.server} 1`, { capacityRps: 100 }),
        lessonNode('db-1', 'database', col(1), ROWS[2], `${v.database} 1`, { capacityRps: 200 }),
      ],
      edges: [lessonEdge('client-1', 'server-1'), lessonEdge('server-1', 'db-1')],
    }),
    win: {
      type: 'and',
      conditions: [
        { type: 'flag', flag: 'started' },
        {
          type: 'sustained',
          seconds: 3,
          condition: { type: 'node-utilization', nodeId: 'server-1', op: 'gte', value: 0.8 },
        },
      ],
    },
    balloons: [
      {
        id: 'start',
        titleKey: 'lesson.0.2.balloon.start.title',
        bodyKey: 'lesson.0.2.balloon.start.body',
        anchor: { type: 'toolbar', target: 'start' },
        advanceWhen: { type: 'flag', flag: 'started' },
      },
      {
        id: 'slider',
        titleKey: 'lesson.0.2.balloon.slider.title',
        bodyKey: 'lesson.0.2.balloon.slider.body',
        anchor: { type: 'field', nodeId: 'client-1', field: 'rps' },
        advanceWhen: { type: 'config-number', nodeId: 'client-1', key: 'rps', op: 'gte', value: 80 },
      },
      {
        id: 'hold',
        titleKey: 'lesson.0.2.balloon.hold.title',
        bodyKey: 'lesson.0.2.balloon.hold.body',
        anchor: { type: 'node', nodeId: 'server-1' },
        advanceWhen: {
          type: 'sustained',
          seconds: 3,
          condition: { type: 'node-utilization', nodeId: 'server-1', op: 'gte', value: 0.8 },
        },
      },
    ],
  },
];

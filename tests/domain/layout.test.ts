import { describe, expect, it } from 'vitest';

import { LESSONS } from '@/application/lessons';
import { PRESETS } from '@/application/presets/presets';
import type { DiagramNode } from '@/domain/diagram/diagram';
import { findOverlaps, RUNNING_NODE_HEIGHT, stackRows } from '@/domain/diagram/layout';
import { createDefaultConfig } from '@/domain/nodes/defaults';
import type { NodeKind } from '@/domain/simulation/node-kind';

import { TEST_VOCABULARY } from '../support/i18n';

function node(id: string, kind: NodeKind, x: number, y: number): DiagramNode {
  return {
    id,
    type: kind,
    position: { x, y },
    data: { kind, config: createDefaultConfig(kind, id) } as DiagramNode['data'],
  };
}

describe('row stacking', () => {
  it('gives each row the height its tallest card needs', () => {
    const stacked = stackRows([
      node('c', 'client', 0, 0),
      node('s', 'server', 0, 100),
      node('d', 'database', 0, 200),
    ]);

    const y = Object.fromEntries(stacked.map((item) => [item.id, item.position.y]));
    expect(y.c).toBe(0);
    expect(y.s).toBe(RUNNING_NODE_HEIGHT.client + 56);
    expect(y.d).toBe(RUNNING_NODE_HEIGHT.client + 56 + RUNNING_NODE_HEIGHT.server + 56);
  });

  it('keeps nodes on the same row side by side', () => {
    const stacked = stackRows([
      node('a', 'server', 0, 320),
      node('b', 'server', 340, 320),
    ]);

    expect(stacked[0].position.y).toBe(stacked[1].position.y);
    expect(stacked[0].position.x).not.toBe(stacked[1].position.x);
  });

  it('is idempotent', () => {
    const once = stackRows([node('c', 'client', 0, 0), node('s', 'server', 0, 320)]);
    expect(stackRows(once)).toEqual(once);
  });
});

/**
 * Cards grow by roughly 40% when the metric block appears, so a diagram laid
 * out against the stopped card collides the moment the learner presses play.
 * Every shipped diagram is checked against the *running* height.
 */
describe('shipped diagrams never overlap while running', () => {
  it.each(LESSONS.map((lesson) => lesson.id))('lesson %s', (id) => {
    const lesson = LESSONS.find((item) => item.id === id)!;
    expect(findOverlaps(lesson.build(TEST_VOCABULARY).nodes)).toEqual([]);
  });

  it.each(PRESETS.map((preset) => preset.id))('preset %s', (id) => {
    const preset = PRESETS.find((item) => item.id === id)!;
    expect(findOverlaps(preset.build(TEST_VOCABULARY).nodes)).toEqual([]);
  });
});

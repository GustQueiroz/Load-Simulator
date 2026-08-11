import { describe, expect, it } from 'vitest';

import { estimateMonthlyCost } from '@/application/cost/cost-engine';
import { costProfileOf } from '@/application/cost/profiles';
import { PRESETS, presetById } from '@/application/presets/presets';
import { exportDin, serializeDin } from '@/application/serialization/export-din';
import { importDin } from '@/application/serialization/import-din';
import { toSimulationNodes } from '@/domain/diagram/diagram';

import { presetName, TEST_VOCABULARY } from '../support/i18n';

const NOW = '2026-08-10T18:00:00.000Z';
const SETTINGS = { cloud: 'aws', tickMs: 100, presentationMode: false } as const;

function exportPreset(presetId: string) {
  const preset = presetById(presetId);
  if (!preset) throw new Error(`Unknown preset ${presetId}`);
  const snapshot = preset.build(TEST_VOCABULARY);
  return exportDin({
    name: presetName(preset.id),
    nodes: snapshot.nodes,
    edges: snapshot.edges,
    viewport: { x: 12, y: -34, zoom: 0.85 },
    settings: { ...SETTINGS },
    now: NOW,
  });
}

describe('.din round trip', () => {
  it.each(PRESETS.map((preset) => preset.id))('preserves the "%s" preset', (presetId) => {
    const original = exportPreset(presetId);
    const result = importDin(serializeDin(original));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const reexported = exportDin({
      name: result.diagram.name,
      nodes: result.diagram.nodes,
      edges: result.diagram.edges,
      viewport: result.diagram.viewport,
      settings: result.diagram.settings,
      createdAt: result.diagram.createdAt,
      now: NOW,
    });

    expect(reexported).toEqual(original);
  });

  it('keeps every node and edge', () => {
    const original = exportPreset('load-balancer-basics');
    const result = importDin(serializeDin(original));

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diagram.nodes).toHaveLength(7);
    expect(result.diagram.edges).toHaveLength(8);
    expect(result.diagram.viewport).toEqual({ x: 12, y: -34, zoom: 0.85 });
  });

  it('never persists runtime metrics', () => {
    const serialized = serializeDin(exportPreset('single-server'));
    expect(serialized).not.toContain('metrics');
    expect(serialized).not.toContain('backlog');
    expect(serialized).not.toContain('utilization');
  });
});

describe('.din validation', () => {
  it('rejects a file that is not JSON', () => {
    const result = importDin('não é json');
    expect(result.ok).toBe(false);
  });

  it('rejects a file from a newer version', () => {
    const file = { ...exportPreset('single-server'), version: 99 };
    const result = importDin(JSON.stringify(file));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error.code).toBe('newer-version');
  });

  it('rejects impossible configuration values', () => {
    const file = exportPreset('single-server');
    const broken = structuredClone(file);
    broken.nodes[0].data.config.baseFailureRate = 4;

    const result = importDin(JSON.stringify(broken));
    expect(result.ok).toBe(false);
  });

  it('drops edges whose endpoints no longer exist', () => {
    const file = exportPreset('single-server');
    file.edges.push({
      id: 'ghost',
      source: 'nowhere',
      target: 'server-1',
      sourceHandle: null,
      targetHandle: null,
      enabled: true,
    });

    const result = importDin(JSON.stringify(file));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.diagram.edges.some((edge) => edge.id === 'ghost')).toBe(false);
  });
});

describe('cost estimation', () => {
  it('grows with the architecture and stays a positive estimate', () => {
    const small = presetById('single-server')?.build(TEST_VOCABULARY);
    const big = presetById('load-balancer-basics')?.build(TEST_VOCABULARY);
    if (!small || !big) throw new Error('missing presets');

    const profile = costProfileOf('aws');
    const smallCost = estimateMonthlyCost(toSimulationNodes(small.nodes), new Map(), profile);
    const bigCost = estimateMonthlyCost(toSimulationNodes(big.nodes), new Map(), profile);

    expect(smallCost.totalMonthlyUsd).toBeGreaterThan(0);
    expect(bigCost.totalMonthlyUsd).toBeGreaterThan(smallCost.totalMonthlyUsd);
    expect(bigCost.lines.map((line) => line.key)).toContain('server');
  });

  it('ignores disabled components', () => {
    const snapshot = presetById('single-server')?.build(TEST_VOCABULARY);
    if (!snapshot) throw new Error('missing preset');

    const profile = costProfileOf('aws');
    const nodes = toSimulationNodes(snapshot.nodes);
    const withEverything = estimateMonthlyCost(nodes, new Map(), profile);

    const disabled = nodes.map((node) =>
      node.kind === 'database' ? { ...node, config: { ...node.config, enabled: false } } : node,
    );
    const withoutDatabase = estimateMonthlyCost(disabled, new Map(), profile);

    expect(withoutDatabase.totalMonthlyUsd).toBeLessThan(withEverything.totalMonthlyUsd);
  });
});

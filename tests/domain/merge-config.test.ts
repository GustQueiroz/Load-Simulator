import { describe, expect, it } from 'vitest';

import { mergeSimulatorNodeConfig, toConfigPatch } from '@/domain/nodes/merge-config';
import { createDefaultConfig } from '@/domain/nodes/defaults';

describe('mergeSimulatorNodeConfig', () => {
  it('keeps the discriminated kind when patching', () => {
    const data = {
      kind: 'server' as const,
      config: createDefaultConfig('server', 'API 1'),
    };

    const merged = mergeSimulatorNodeConfig(data, toConfigPatch('instances', 4));
    expect(merged.kind).toBe('server');
    if (merged.kind === 'server') {
      expect(merged.config.instances).toBe(4);
      expect(merged.config.label).toBe('API 1');
    }
  });

  it('ignores unrelated keys for the active kind at the type boundary', () => {
    const data = {
      kind: 'cache' as const,
      config: createDefaultConfig('cache', 'Cache 1'),
    };

    const merged = mergeSimulatorNodeConfig(data, { hitRate: 0.9, algorithm: 'random' });
    expect(merged.kind).toBe('cache');
    if (merged.kind === 'cache') {
      expect(merged.config.hitRate).toBe(0.9);
      expect('algorithm' in merged.config).toBe(false);
    }
  });
});

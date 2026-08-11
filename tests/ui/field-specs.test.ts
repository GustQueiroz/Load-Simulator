import { describe, expect, it } from 'vitest';

import { dinNodeDataSchema } from '@/application/serialization/din.schema';
import { createDefaultConfig, DEFAULT_CONFIGS } from '@/domain/nodes/defaults';
import { NODE_KINDS } from '@/domain/simulation/node-kind';
import { FIELD_SPECS, primaryFields } from '@/features/diagram/nodes/field-specs';

describe('configuration field specs', () => {
  it.each(NODE_KINDS)('every "%s" control points at a real property', (kind) => {
    const config = DEFAULT_CONFIGS[kind] as Record<string, unknown>;
    for (const spec of FIELD_SPECS[kind]) {
      expect(Object.hasOwn(config, spec.key), `${kind}.${spec.key}`).toBe(true);
    }
  });

  it.each(NODE_KINDS)('"%s" keeps at least one control on the card', (kind) => {
    expect(primaryFields(kind).length).toBeGreaterThan(0);
  });

  it.each(NODE_KINDS)('slider bounds contain the "%s" default value', (kind) => {
    const config = DEFAULT_CONFIGS[kind] as unknown as Record<string, number>;
    for (const spec of FIELD_SPECS[kind]) {
      if (spec.type !== 'slider') continue;
      expect(config[spec.key], `${kind}.${spec.key}`).toBeGreaterThanOrEqual(spec.min);
      expect(config[spec.key], `${kind}.${spec.key}`).toBeLessThanOrEqual(spec.max);
    }
  });
});

describe('default configurations', () => {
  it.each(NODE_KINDS)('a new "%s" is a valid serializable node', (kind) => {
    const result = dinNodeDataSchema.safeParse({
      kind,
      config: createDefaultConfig(kind, 'Teste 1'),
    });
    expect(result.success).toBe(true);
  });
});

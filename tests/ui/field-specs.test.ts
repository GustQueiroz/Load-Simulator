import { describe, expect, it } from 'vitest';

import { dinNodeDataSchema } from '@/application/serialization/din.schema';
import { createDefaultConfig, DEFAULT_CONFIGS } from '@/domain/nodes/defaults';
import { NODE_KINDS } from '@/domain/simulation/node-kind';
import {
  ALGORITHM_LABEL_KEYS,
  FIELD_SPECS,
  primaryFields,
  TRAFFIC_MODE_LABEL_KEYS,
} from '@/features/diagram/nodes/field-specs';
import { en } from '@/i18n/messages/en';
import { ptBR, type MessageKey } from '@/i18n/messages/pt-BR';

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

  it('select options resolve to catalogue keys in both locales', () => {
    const labelKeys = [
      ...Object.values(TRAFFIC_MODE_LABEL_KEYS),
      ...Object.values(ALGORITHM_LABEL_KEYS),
    ] as MessageKey[];

    for (const key of labelKeys) {
      expect(ptBR[key].trim().length).toBeGreaterThan(0);
      expect(en[key].trim().length).toBeGreaterThan(0);
    }

    for (const kind of NODE_KINDS) {
      for (const spec of FIELD_SPECS[kind]) {
        if (spec.type !== 'select') continue;
        for (const option of spec.options) {
          expect(ptBR[option.labelKey].trim().length).toBeGreaterThan(0);
          expect(en[option.labelKey].trim().length).toBeGreaterThan(0);
        }
      }
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

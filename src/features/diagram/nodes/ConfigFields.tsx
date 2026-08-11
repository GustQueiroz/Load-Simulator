'use client';

import { memo } from 'react';

import { SelectField, SliderField, ToggleField } from '@/components/ui/fields';
import type { AnyNodeConfig } from '@/domain/nodes/config';
import { useT } from '@/i18n/I18nProvider';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { formatPercent } from '@/lib/format';

import type { FieldSpec } from './field-specs';

/**
 * Renders configuration controls from their declarative specs.
 *
 * Values are read positionally from the config object: specs are keyed by
 * property name and a test asserts every key exists on the matching kind.
 */
export const ConfigFields = memo(function ConfigFields({
  nodeId,
  config,
  specs,
  accent,
}: {
  nodeId: string;
  config: AnyNodeConfig;
  specs: readonly FieldSpec[];
  accent: string;
}) {
  const t = useT();
  const updateNodeConfig = useSimulatorStore((state) => state.updateNodeConfig);
  const values = config as unknown as Record<string, number | string | boolean>;

  const patch = (key: string, value: number | string | boolean) =>
    updateNodeConfig(nodeId, { [key]: value } as Partial<AnyNodeConfig>);

  return (
    <div className="space-y-2.5 px-3 py-2.5">
      {specs.map((spec) => {
        const label = t(spec.labelKey);
        const hint = spec.hintKey ? t(spec.hintKey) : undefined;

        switch (spec.type) {
          case 'slider':
            return (
              <SliderField
                key={spec.key}
                label={label}
                hint={hint}
                min={spec.min}
                max={spec.max}
                step={spec.step}
                accent={accent}
                value={Number(values[spec.key] ?? 0)}
                format={spec.format}
                onChange={(value) => patch(spec.key, value)}
              />
            );

          case 'percent':
            return (
              <SliderField
                key={spec.key}
                label={label}
                hint={hint}
                min={0}
                max={100}
                step={1}
                accent={accent}
                value={Math.round(Number(values[spec.key] ?? 0) * 100)}
                format={(value) => formatPercent(value / 100)}
                onChange={(value) => patch(spec.key, value / 100)}
              />
            );

          case 'select':
            return (
              <SelectField
                key={spec.key}
                label={label}
                hint={hint}
                value={String(values[spec.key] ?? '')}
                options={spec.options}
                onChange={(value) => patch(spec.key, value)}
              />
            );

          case 'toggle':
            return (
              <ToggleField
                key={spec.key}
                label={label}
                hint={hint}
                checked={Boolean(values[spec.key])}
                onChange={(checked) => patch(spec.key, checked)}
              />
            );
        }
      })}
    </div>
  );
});

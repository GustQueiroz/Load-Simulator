'use client';

import { memo, type ReactNode } from 'react';

import { isLessonFieldLocked } from '@/application/lessons';
import { SelectField, SliderField, ToggleField } from '@/components/ui/fields';
import type { AnyNodeConfig } from '@/domain/nodes/config';
import { toConfigPatch } from '@/domain/nodes/merge-config';
import type { NodeKind } from '@/domain/simulation/node-kind';
import { useActiveLesson, useLessonHighlight } from '@/features/lessons/lesson-session-store';
import { useT } from '@/i18n/I18nProvider';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { cn } from '@/lib/cn';
import { formatPercent } from '@/lib/format';

import {
  readConfigBoolean,
  readConfigNumber,
  readConfigString,
  type FieldSpec,
} from './field-specs';

export const ConfigFields = memo(function ConfigFields({
  nodeId,
  kind,
  config,
  specs,
  accent,
}: {
  nodeId: string;
  kind: NodeKind;
  config: AnyNodeConfig;
  specs: readonly FieldSpec[];
  accent: string;
}) {
  const t = useT();
  const updateNodeConfig = useSimulatorStore((state) => state.updateNodeConfig);
  const highlight = useLessonHighlight();
  const lesson = useActiveLesson();

  const patch = (key: string, value: number | string | boolean) => {
    if (isLessonFieldLocked(lesson, nodeId, kind, key)) return;
    updateNodeConfig(nodeId, toConfigPatch(key, value));
  };

  return (
    <div className="space-y-2.5 px-3 py-2.5">
      {specs.map((spec) => {
        const label = t(spec.labelKey);
        const locked = isLessonFieldLocked(lesson, nodeId, kind, spec.key);
        const hint = locked
          ? t('lesson.fieldLocked')
          : spec.hintKey
            ? t(spec.hintKey)
            : undefined;
        const highlighted =
          highlight?.type === 'field' &&
          highlight.nodeId === nodeId &&
          highlight.field === spec.key;

        const wrap = (child: ReactNode) => (
          <div
            key={spec.key}
            data-lesson-field={`${nodeId}:${spec.key}`}
            className={cn(
              highlighted && 'rounded-lg ring-2 ring-sky-400/80 ring-offset-2 ring-offset-transparent',
              locked && 'opacity-70',
            )}
          >
            {child}
          </div>
        );

        switch (spec.type) {
          case 'slider':
            return wrap(
              <SliderField
                label={label}
                hint={hint}
                min={spec.min}
                max={spec.max}
                step={spec.step}
                accent={accent}
                value={readConfigNumber(config, spec.key)}
                format={spec.format}
                disabled={locked}
                onChange={(value) => patch(spec.key, value)}
              />,
            );

          case 'percent':
            return wrap(
              <SliderField
                label={label}
                hint={hint}
                min={0}
                max={100}
                step={1}
                accent={accent}
                value={Math.round(readConfigNumber(config, spec.key) * 100)}
                format={(value) => formatPercent(value / 100)}
                disabled={locked}
                onChange={(value) => patch(spec.key, value / 100)}
              />,
            );

          case 'select':
            return wrap(
              <SelectField
                label={label}
                hint={hint}
                value={readConfigString(config, spec.key)}
                options={spec.options.map((option) => ({
                  value: option.value,
                  label: t(option.labelKey),
                }))}
                disabled={locked}
                onChange={(value) => patch(spec.key, value)}
              />,
            );

          case 'toggle':
            return wrap(
              <ToggleField
                label={label}
                hint={hint}
                checked={readConfigBoolean(config, spec.key)}
                disabled={locked}
                onChange={(checked) => patch(spec.key, checked)}
              />,
            );
        }
      })}
    </div>
  );
});

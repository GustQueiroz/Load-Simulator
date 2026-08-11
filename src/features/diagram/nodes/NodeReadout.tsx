'use client';

import { memo } from 'react';

import type { NodeMetrics } from '@/domain/simulation/metrics';
import type { LoadStatus } from '@/domain/simulation/status';
import { useT, type Translate } from '@/i18n/I18nProvider';
import { statusKey } from '@/i18n/keys';
import { useNodeMetrics, useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { cn } from '@/lib/cn';
import { formatPercent } from '@/lib/format';

import { STATUS_COLOR } from './node-theme';

export type MetricTone = 'default' | 'ok' | 'warn' | 'danger';

export interface MetricRow {
  label: string;
  value: string;
  tone?: MetricTone;
}

export type MetricRowsBuilder = (metrics: NodeMetrics, t: Translate) => MetricRow[];

const TONE_CLASS: Record<MetricTone, string> = {
  default: 'text-ink',
  ok: 'text-emerald-400',
  warn: 'text-amber-400',
  danger: 'text-rose-400',
};

/**
 * Live numbers of a node.
 *
 * Subscribes on its own so a tick re-renders this block only — the sliders
 * above it keep their identity and never flicker while being dragged.
 */
export const NodeReadout = memo(function NodeReadout({
  nodeId,
  rows,
}: {
  nodeId: string;
  rows: MetricRowsBuilder;
}) {
  const t = useT();
  const hasFrame = useSimulatorStore((state) => state.tick > 0);
  const metrics = useNodeMetrics(nodeId);

  if (!hasFrame) return null;

  return (
    <dl className="grid grid-cols-2 gap-x-3 gap-y-1 border-b border-line/70 px-3 py-2">
      {rows(metrics, t).map((row) => (
        <div key={row.label} className="flex items-baseline justify-between gap-1.5">
          <dt className="truncate text-[10.5px] text-faint">{row.label}</dt>
          <dd
            className={cn(
              'font-mono text-[11.5px] tabular-nums',
              TONE_CLASS[row.tone ?? 'default'],
            )}
          >
            {row.value}
          </dd>
        </div>
      ))}
    </dl>
  );
});

/** Utilization bar plus the written status — never colour alone. */
export const NodeLoadBar = memo(function NodeLoadBar({
  nodeId,
  labelKey = 'node.load',
}: {
  nodeId: string;
  labelKey?: 'node.load' | 'node.pressure';
}) {
  const t = useT();
  const hasFrame = useSimulatorStore((state) => state.tick > 0);
  const metrics = useNodeMetrics(nodeId);

  if (!hasFrame) return null;

  return (
    <div className="space-y-1 px-3 pt-2 pb-3">
      <div className="flex items-baseline justify-between">
        <span className="text-[10.5px] tracking-wide text-faint uppercase">{t(labelKey)}</span>
        <span
          className="font-mono text-[11.5px] tabular-nums"
          style={{ color: STATUS_COLOR[metrics.status] }}
        >
          {formatPercent(metrics.utilization)} · {t(statusKey(metrics.status)).toUpperCase()}
        </span>
      </div>
      <UtilizationBar utilization={metrics.utilization} status={metrics.status} />
    </div>
  );
});

export function UtilizationBar({
  utilization,
  status,
}: {
  utilization: number;
  status: LoadStatus;
}) {
  // The bar is clamped at 100%; the label above it still tells the truth
  // (142% is a number the audience needs to read).
  const width = Math.min(100, Math.max(0, utilization * 100));
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-[#22304a]">
      <div
        className="h-full rounded-full transition-[width] duration-200 ease-out"
        style={{ width: `${width}%`, backgroundColor: STATUS_COLOR[status] }}
      />
    </div>
  );
}

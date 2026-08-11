'use client';

import type { NodeProps } from '@xyflow/react';
import { memo } from 'react';

import { formatCount, formatLatency, formatRps } from '@/lib/format';
import { useNodeMetrics } from '@/infrastructure/store/simulator-store';

import { pressSimulatorButton } from '@/features/simulation/engine-host';

import { ComponentNode } from './ComponentNode';
import type { FlowNodeOf } from './flow-node-types';
import type { MetricRowsBuilder } from './NodeReadout';

const rows: MetricRowsBuilder = (metrics, t) => [
  { label: t('metric.sent'), value: formatRps(metrics.outgoingRps) },
  {
    label: t('metric.pending'),
    value: formatCount(metrics.pendingCount ?? metrics.queueDepth),
  },
  {
    label: t('metric.cooldown'),
    value: formatLatency(metrics.cooldownRemainingMs ?? 0),
    tone: (metrics.cooldownRemainingMs ?? 0) > 0 ? 'warn' : 'default',
  },
];

export const ButtonNode = memo(function ButtonNode({
  id,
  data,
  selected,
}: NodeProps<FlowNodeOf<'button'>>) {
  const metrics = useNodeMetrics(id);
  const onCooldown = (metrics.cooldownRemainingMs ?? 0) > 0;
  const enabled = data.config.enabled;

  return (
    <ComponentNode
      id={id}
      kind="button"
      config={data.config}
      selected={selected}
      rows={rows}
      hasInput={false}
      showLoad={false}
    >
      <div className="flex flex-col items-center gap-1.5 px-3 pb-2">
        <button
          type="button"
          className="nodrag nopan relative flex size-16 items-center justify-center rounded-full border-2 border-rose-300/80 bg-gradient-to-b from-rose-400 to-rose-600 text-sm font-bold tracking-wide text-white shadow-[0_6px_0_0_rgb(190,18,60),0_10px_20px_-8px_rgba(225,29,72,0.55)] transition-[transform,box-shadow,filter] duration-100 ease-out hover:brightness-110 active:translate-y-1 active:shadow-[0_2px_0_0_rgb(190,18,60),0_4px_10px_-6px_rgba(225,29,72,0.5)] disabled:translate-y-1 disabled:cursor-not-allowed disabled:border-rose-200/40 disabled:from-rose-300/70 disabled:to-rose-500/70 disabled:shadow-[0_2px_0_0_rgb(190,18,60)] disabled:brightness-90"
          disabled={!enabled || onCooldown}
          aria-label={data.config.label}
          title={onCooldown ? undefined : data.config.label}
          onClick={(event) => {
            event.stopPropagation();
            pressSimulatorButton(id);
          }}
        >
          <span className="pointer-events-none select-none">
            {data.config.requestsPerClick > 1 ? `×${data.config.requestsPerClick}` : 'GO'}
          </span>
          {onCooldown ? (
            <span className="absolute inset-x-1 bottom-1 h-1 overflow-hidden rounded-full bg-black/25">
              <span
                className="block h-full rounded-full bg-white/80 transition-[width] duration-100"
                style={{
                  width: `${Math.max(
                    4,
                    100 *
                      (1 -
                        (metrics.cooldownRemainingMs ?? 0) /
                          Math.max(data.config.cooldownMs, 1)),
                  )}%`,
                }}
              />
            </span>
          ) : null}
        </button>
        {data.config.automatorRps > 0 ? (
          <p className="text-[10px] font-medium text-rose-200/90">
            auto {formatRps(data.config.automatorRps)}
          </p>
        ) : null}
      </div>
    </ComponentNode>
  );
});

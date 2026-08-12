'use client';

import type { NodeProps } from '@xyflow/react';
import { memo } from 'react';

import { formatCount, formatLatency, formatPercent, formatRps } from '@/lib/format';
import { safeDivide } from '@/lib/math';

import { ComponentNode } from './ComponentNode';
import type { FlowNodeOf } from './flow-node-types';
import type { MetricRowsBuilder } from './NodeReadout';

const rows: MetricRowsBuilder = (metrics, t) => [
  { label: t('metric.incoming'), value: formatRps(metrics.incomingRps) },
  { label: t('metric.processed'), value: formatRps(metrics.processedRps) },
  { label: t('metric.latency'), value: formatLatency(metrics.localLatencyMs) },
  { label: t('metric.p95'), value: formatLatency(metrics.localP95Ms) },
  {
    label: t('metric.connections'),
    value: formatPercent(metrics.connectionUtilization ?? 0),
    tone: (metrics.connectionUtilization ?? 0) >= 0.8 ? 'danger' : 'default',
  },
  {
    label: t('metric.queue'),
    value: formatCount(metrics.queueDepth),
    tone: metrics.queueDepth > 0 ? 'warn' : 'default',
  },
  {
    label: t('metric.failed'),
    value: formatRps(metrics.failedRps),
    tone: metrics.failedRps > 0 ? 'danger' : 'default',
  },
  {
    label: t('metric.failureRate'),
    value: formatPercent(safeDivide(metrics.failedRps, metrics.incomingRps)),
    tone: metrics.failedRps > 0 ? 'danger' : 'default',
  },
];

export const DatabaseNode = memo(function DatabaseNode({
  id,
  data,
  selected,
}: NodeProps<FlowNodeOf<'database'>>) {
  return (
    <ComponentNode id={id} kind="database" config={data.config} selected={selected} rows={rows} />
  );
});

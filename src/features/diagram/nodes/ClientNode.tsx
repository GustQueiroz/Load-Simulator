'use client';

import type { NodeProps } from '@xyflow/react';
import { memo } from 'react';

import { formatLatency, formatRps } from '@/lib/format';

import { ComponentNode } from './ComponentNode';
import type { FlowNodeOf } from './flow-node-types';
import type { MetricRowsBuilder } from './NodeReadout';

const rows: MetricRowsBuilder = (metrics, t) => [
  { label: t('metric.requests'), value: formatRps(metrics.processedRps) },
  { label: t('metric.response'), value: formatLatency(metrics.responseLatencyMs) },
  { label: t('metric.sent'), value: formatRps(metrics.outgoingRps) },
  {
    label: t('metric.failed'),
    value: formatRps(metrics.failedRps),
    tone: metrics.failedRps > 0 ? 'danger' : 'default',
  },
];

export const ClientNode = memo(function ClientNode({
  id,
  data,
  selected,
}: NodeProps<FlowNodeOf<'client'>>) {
  return (
    <ComponentNode
      id={id}
      kind="client"
      config={data.config}
      selected={selected}
      rows={rows}

      hasInput={false}
      showLoad={false}
    />
  );
});

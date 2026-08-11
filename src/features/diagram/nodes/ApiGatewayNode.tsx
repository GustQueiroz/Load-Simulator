'use client';

import type { NodeProps } from '@xyflow/react';
import { memo } from 'react';

import { formatRps } from '@/lib/format';

import { ComponentNode } from './ComponentNode';
import type { FlowNodeOf } from './flow-node-types';
import type { MetricRowsBuilder } from './NodeReadout';

const rows: MetricRowsBuilder = (metrics, t) => [
  { label: t('metric.incoming'), value: formatRps(metrics.incomingRps) },
  { label: t('metric.accepted'), value: formatRps(metrics.processedRps), tone: 'ok' },
  {
    label: t('metric.throttled'),
    value: formatRps(metrics.throttledRps ?? 0),
    tone: (metrics.throttledRps ?? 0) > 0 ? 'warn' : 'default',
  },
  {
    label: t('metric.failed'),
    value: formatRps(metrics.failedRps),
    tone: metrics.failedRps > 0 ? 'danger' : 'default',
  },
];

export const ApiGatewayNode = memo(function ApiGatewayNode({
  id,
  data,
  selected,
}: NodeProps<FlowNodeOf<'apiGateway'>>) {
  return (
    <ComponentNode id={id} kind="apiGateway" config={data.config} selected={selected} rows={rows} />
  );
});

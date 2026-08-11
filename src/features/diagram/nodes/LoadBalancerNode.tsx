'use client';

import type { NodeProps } from '@xyflow/react';
import { memo } from 'react';

import { useT } from '@/i18n/I18nProvider';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { formatLatency, formatRps } from '@/lib/format';

import { ComponentNode } from './ComponentNode';
import type { FlowNodeOf } from './flow-node-types';
import { NodeWarning } from './NodeWarning';
import type { MetricRowsBuilder } from './NodeReadout';

const rows: MetricRowsBuilder = (metrics, t) => [
  { label: t('metric.incoming'), value: formatRps(metrics.incomingRps) },
  { label: t('metric.distributed'), value: formatRps(metrics.outgoingRps) },
  { label: t('metric.latency'), value: formatLatency(metrics.localLatencyMs) },
  {
    label: t('metric.failed'),
    value: formatRps(metrics.failedRps),
    tone: metrics.failedRps > 0 ? 'danger' : 'default',
  },
];

export const LoadBalancerNode = memo(function LoadBalancerNode({
  id,
  data,
  selected,
}: NodeProps<FlowNodeOf<'loadBalancer'>>) {
  const t = useT();
  const targetCount = useSimulatorStore(
    (state) => state.edges.filter((edge) => edge.source === id).length,
  );

  return (
    <ComponentNode id={id} kind="loadBalancer" config={data.config} selected={selected} rows={rows}>
      {targetCount === 0 ? (
        <NodeWarning>{t('node.noTargets')}</NodeWarning>
      ) : null}
    </ComponentNode>
  );
});

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
  { label: t('metric.hits'), value: formatRps(metrics.hitsRps ?? 0), tone: 'ok' },
  { label: t('metric.misses'), value: formatRps(metrics.missesRps ?? 0), tone: 'warn' },
  { label: t('metric.latency'), value: formatLatency(metrics.localLatencyMs) },
  {
    label: t('metric.failed'),
    value: formatRps(metrics.failedRps),
    tone: metrics.failedRps > 0 ? 'danger' : 'default',
  },
];

export const CacheNode = memo(function CacheNode({
  id,
  data,
  selected,
}: NodeProps<FlowNodeOf<'cache'>>) {
  const t = useT();
  const hasTarget = useSimulatorStore((state) =>
    state.edges.some((edge) => edge.source === id),
  );

  return (
    <ComponentNode id={id} kind="cache" config={data.config} selected={selected} rows={rows}>
      {!hasTarget ? (
        <NodeWarning>{t('node.cacheNoTarget')}</NodeWarning>
      ) : null}
    </ComponentNode>
  );
});

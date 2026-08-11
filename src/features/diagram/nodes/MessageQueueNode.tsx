'use client';

import type { NodeProps } from '@xyflow/react';
import { memo } from 'react';

import { useT } from '@/i18n/I18nProvider';
import { useNodeMetrics } from '@/infrastructure/store/simulator-store';
import { formatCount, formatRps, formatSeconds } from '@/lib/format';

import { ComponentNode } from './ComponentNode';
import type { FlowNodeOf } from './flow-node-types';
import type { MetricRowsBuilder } from './NodeReadout';

const rows: MetricRowsBuilder = (metrics, t) => [
  { label: t('metric.incoming'), value: formatRps(metrics.incomingRps) },
  { label: t('metric.delivered'), value: formatRps(metrics.outgoingRps) },
  {
    label: t('metric.backlog'),
    value: formatCount(metrics.queueDepth),
    tone: metrics.queueDepth > 0 ? 'warn' : 'default',
  },
  {
    label: t('metric.failed'),
    value: formatRps(metrics.failedRps),
    tone: metrics.failedRps > 0 ? 'danger' : 'default',
  },
];

export const MessageQueueNode = memo(function MessageQueueNode({
  id,
  data,
  selected,
}: NodeProps<FlowNodeOf<'messageQueue'>>) {
  return (
    <ComponentNode
      id={id}
      kind="messageQueue"
      config={data.config}
      selected={selected}
      rows={rows}
      loadLabelKey="node.pressure"
    >
      <DrainEstimate nodeId={id} />
    </ComponentNode>
  );
});

const DrainEstimate = memo(function DrainEstimate({ nodeId }: { nodeId: string }) {
  const t = useT();
  const drainSeconds = useNodeMetrics(nodeId).drainSeconds;
  if (drainSeconds === undefined || drainSeconds <= 0) return null;

  return (
    <p className="mx-3 mb-2 rounded-md bg-emerald-500/10 px-2 py-1 text-[10.5px] text-emerald-300">
      {t('node.draining', { seconds: formatSeconds(drainSeconds) })}
    </p>
  );
});

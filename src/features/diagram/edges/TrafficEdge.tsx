'use client';

import {
  BaseEdge,
  EdgeLabelRenderer,
  getBezierPath,
  type EdgeProps,
  type EdgeTypes,
} from '@xyflow/react';
import { memo } from 'react';

import { useEdgeMetrics, useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { clamp } from '@/lib/math';
import { formatRps } from '@/lib/format';

import { STATUS_COLOR } from '../nodes/node-theme';

const IDLE_STROKE = '#334867';

/**
 * A link, drawn as traffic.
 *
 * Thickness follows a log scale — with a linear one, a 10.000 req/s edge would
 * swallow the diagram while a 50 req/s edge disappeared.
 */
export const TrafficEdge = memo(function TrafficEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  selected,
}: EdgeProps) {
  const metrics = useEdgeMetrics(id);
  const isRunning = useSimulatorStore((state) => state.status === 'running');
  const showLabels = useSimulatorStore((state) => state.showEdgeLabels);

  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
  });

  const active = metrics.rps > 0;
  const strokeWidth = clamp(1.5 + Math.log10(1 + metrics.rps), 1.5, 6);
  const stroke = active ? STATUS_COLOR[metrics.status] : IDLE_STROKE;

  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        interactionWidth={18}
        className={active && isRunning ? 'traffic-edge--running' : undefined}
        style={{
          stroke: selected ? '#7dd3fc' : stroke,
          strokeWidth,
          opacity: active ? 0.95 : 0.6,
        }}
      />
      {showLabels && active ? (
        <EdgeLabelRenderer>
          <div
            className="nodrag nopan pointer-events-none absolute rounded-md border border-line bg-[#0b1626]/90 px-1.5 py-0.5 font-mono text-[10px] tabular-nums"
            style={{
              transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)`,
              color: stroke,
            }}
          >
            {formatRps(metrics.rps)}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
});

export const EDGE_TYPES: EdgeTypes = { traffic: TrafficEdge };

import type { SimulationNode } from '@/domain/simulation/graph';
import type { NodeMetrics } from '@/domain/simulation/metrics';
import type { LoadStatus } from '@/domain/simulation/status';

export type SimulationEventCode =
  | 'status.warning'
  | 'status.critical'
  | 'status.recovered'
  | 'queue.building'
  | 'queue.draining'
  | 'shedding.start'
  | 'shedding.stop'
  | 'pool.hot'
  | 'button.fired'
  | 'client.rampDone'
  | 'client.spikeStart'
  | 'client.spikeEnd';

export interface SimulationEvent {
  id: string;
  tick: number;
  atSeconds: number;
  code: SimulationEventCode;
  nodeId?: string;
  nodeLabel?: string;

  params?: Readonly<Record<string, number>>;
}

export const MAX_EVENT_LOG = 80;

const STATUS_RANK: Record<LoadStatus, number> = {
  idle: 0,
  normal: 1,
  warning: 2,
  critical: 3,
};

export function detectSimulationEvents(args: {
  tick: number;
  atSeconds: number;
  previousSeconds: number;
  nodes: readonly SimulationNode[];
  previous: ReadonlyMap<string, NodeMetrics>;
  current: ReadonlyMap<string, NodeMetrics>;
}): SimulationEvent[] {
  const events: SimulationEvent[] = [];
  let seq = 0;
  const push = (
    code: SimulationEventCode,
    node: SimulationNode,
    params?: Record<string, number>,
  ) => {
    events.push({
      id: `${args.tick}-${seq++}-${node.id}-${code}`,
      tick: args.tick,
      atSeconds: args.atSeconds,
      code,
      nodeId: node.id,
      nodeLabel: node.config.label,
      params,
    });
  };

  for (const node of args.nodes) {
    const prev = args.previous.get(node.id);
    const curr = args.current.get(node.id);
    if (!curr) continue;

    const prevStatus = prev?.status ?? 'idle';
    if (STATUS_RANK[curr.status] > STATUS_RANK[prevStatus]) {
      if (curr.status === 'warning') push('status.warning', node, { utilization: curr.utilization });
      if (curr.status === 'critical')
        push('status.critical', node, { utilization: curr.utilization });
    } else if (
      STATUS_RANK[curr.status] < STATUS_RANK[prevStatus] &&
      STATUS_RANK[prevStatus] >= STATUS_RANK.warning &&
      STATUS_RANK[curr.status] <= STATUS_RANK.normal
    ) {
      push('status.recovered', node);
    }

    const prevDepth = prev?.queueDepth ?? 0;
    if (prevDepth <= 0 && curr.queueDepth > 0) {
      push('queue.building', node, { backlog: curr.queueDepth });
    } else if (prevDepth > 0 && curr.queueDepth <= 0) {
      push('queue.draining', node);
    }

    const prevDropped = prev?.droppedRps ?? 0;
    if (prevDropped <= 0 && curr.droppedRps > 0) {
      push('shedding.start', node, { dropped: curr.droppedRps });
    } else if (prevDropped > 0 && curr.droppedRps <= 0) {
      push('shedding.stop', node);
    }

    const prevPool = prev?.connectionUtilization ?? 0;
    const currPool = curr.connectionUtilization ?? 0;
    if (prevPool < 0.8 && currPool >= 0.8) {
      push('pool.hot', node, { percent: currPool });
    }

    if (node.kind === 'button') {
      const prevOut = prev?.outgoingRps ?? 0;
      if (prevOut <= 0 && curr.outgoingRps > 0 && node.config.automatorRps <= 0) {
        push('button.fired', node, { rps: curr.outgoingRps });
      }
    }

    if (node.kind === 'client') {
      if (node.config.trafficMode === 'ramp') {
        const duration = Math.max(0.001, node.config.rampDurationSeconds);
        if (args.previousSeconds < duration && args.atSeconds >= duration) {
          push('client.rampDone', node, { rps: node.config.rps });
        }
      }

      if (node.config.trafficMode === 'spike') {
        const at = Math.max(0, node.config.spikeAtSeconds);
        const end = at + Math.max(0, node.config.spikeWidthSeconds);
        if (args.previousSeconds < at && args.atSeconds >= at) {
          push('client.spikeStart', node, { rps: node.config.spikePeakRps });
        }
        if (end > at && args.previousSeconds < end && args.atSeconds >= end) {
          push('client.spikeEnd', node, { rps: node.config.rps });
        }
      }
    }
  }

  return events;
}

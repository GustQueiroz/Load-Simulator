import { capacityRpsOf } from '@/domain/nodes/capacity';
import type { SimulationNode } from '@/domain/simulation/graph';
import type { NodeMetrics } from '@/domain/simulation/metrics';
import type { Translate } from '@/i18n/I18nProvider';
import { formatCount, formatLatency, formatPercent, formatRps, formatSeconds } from '@/lib/format';

export function explainNode(
  node: SimulationNode,
  metrics: NodeMetrics,
  t: Translate,
): string[] {
  if (!node.config.enabled) return [t('explain.disabled')];

  const lines: string[] = [];

  lines.push(
    metrics.incomingRps <= 0
      ? t('explain.noTraffic')
      : t('explain.load', {
          incoming: formatRps(metrics.incomingRps),
          capacity: formatRps(capacityRpsOf(node)),
          utilization: formatPercent(metrics.utilization),
        }),
  );

  switch (node.kind) {
    case 'cache':
      if (metrics.incomingRps > 0) {
        lines.push(
          t('explain.cache', {
            hitRate: formatPercent(node.config.hitRate),
            misses: formatRps(metrics.missesRps ?? 0),
          }),
        );
      }
      break;

    case 'apiGateway':
      if ((metrics.throttledRps ?? 0) > 0) {
        lines.push(t('explain.throttling', { throttled: formatRps(metrics.throttledRps ?? 0) }));
      }
      break;

    case 'messageQueue':
      if (metrics.queueDepth > 0) {
        const backlog = formatCount(metrics.queueDepth);
        lines.push(
          metrics.drainSeconds !== undefined
            ? t('explain.queueDraining', {
                backlog,
                seconds: formatSeconds(metrics.drainSeconds),
              })
            : t('explain.queueGrowing', { backlog }),
        );
      }
      break;

    case 'database':
      if ((metrics.connectionUtilization ?? 0) >= 0.8) {
        lines.push(
          t('explain.pool', { percent: formatPercent(metrics.connectionUtilization ?? 0) }),
        );
      }
      break;

    default:
      break;
  }

  if (metrics.queueDepth > 0 && node.kind !== 'messageQueue') {
    lines.push(
      t('explain.waiting', {
        count: formatCount(metrics.queueDepth),
        latency: formatLatency(metrics.localLatencyMs),
      }),
    );
  }

  if (metrics.failedRps > 0) {
    const rejected = metrics.droppedRps;
    const softOrTimeout = Math.max(0, metrics.failedRps - rejected);
    const total = formatRps(metrics.failedRps);

    if (rejected > 0 && softOrTimeout > 0) {
      lines.push(
        t('explain.failingMixed', {
          total,
          soft: formatRps(softOrTimeout),
          rejected: formatRps(rejected),
        }),
      );
    } else if (rejected > 0) {
      lines.push(t('explain.failingRejected', { total }));
    } else {
      lines.push(t('explain.failingSoft', { total }));
    }
  }

  if (metrics.droppedRps > 0 && node.kind !== 'apiGateway' && metrics.failedRps <= 0) {
    lines.push(t('explain.dropping', { dropped: formatRps(metrics.droppedRps) }));
  }

  if (metrics.incomingRps > 0 && metrics.utilization < 0.6 && metrics.failedRps === 0) {
    lines.push(t('explain.healthy'));
  }

  return lines;
}

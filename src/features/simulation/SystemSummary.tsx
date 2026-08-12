'use client';

import { Activity } from 'lucide-react';

import { useT } from '@/i18n/I18nProvider';
import { statusKey } from '@/i18n/keys';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { formatLatency, formatRps } from '@/lib/format';

import { STATUS_COLOR } from '../diagram/nodes/node-theme';

export function SystemSummary() {
  const t = useT();
  const system = useSimulatorStore((state) => state.system);
  const hasFrame = useSimulatorStore((state) => state.tick > 0);
  const bottleneckLabel = useSimulatorStore((state) => {
    const node = state.nodes.find((item) => item.id === state.system.bottleneckNodeId);
    return node?.data.config.label ?? null;
  });
  const setFocusedNode = useSimulatorStore((state) => state.setFocusedNode);

  return (
    <section className="rounded-xl border border-line bg-panel" data-lesson-anchor="system-panel">
      <header className="flex items-center gap-2 border-b border-line/70 px-3 py-2.5">
        <Activity className="size-3.5 text-sky-400" aria-hidden />
        <h2 className="flex-1 text-xs font-semibold text-ink">{t('system.title')}</h2>
        <span
          className="text-[10.5px] font-medium"
          style={{ color: STATUS_COLOR[system.worstStatus] }}
        >
          {t(statusKey(system.worstStatus))}
        </span>
      </header>

      {hasFrame ? (
        <div className="space-y-1.5 px-3 py-2.5">
          <div className="sr-only" aria-live="polite" aria-atomic="true">
            {bottleneckLabel
              ? t('a11y.sim.bottleneck', { node: bottleneckLabel })
              : t(statusKey(system.worstStatus))}
          </div>
          <Row label={t('system.input')} value={formatRps(system.generatedRps)} />
          <Row label={t('system.success')} value={formatRps(system.completedRps)} tone="#22c55e" />
          <Row
            label={t('system.failures')}
            value={formatRps(system.failedRps)}
            tone={system.failedRps > 0 ? '#ef4444' : undefined}
          />
          {system.droppedRps > 0 ? (
            <Row
              label={t('system.rejected')}
              value={formatRps(system.droppedRps)}
              tone="#f59e0b"
            />
          ) : null}
          {system.bufferedRps > 0 ? (
            <Row
              label={t('system.buffered')}
              value={formatRps(system.bufferedRps)}
              tone="#fb923c"
            />
          ) : null}
          <Row
            label={t('system.e2e')}
            value={formatLatency(system.approximateEndToEndLatencyMs)}
          />
          <Row
            label={t('system.p95')}
            value={formatLatency(system.approximateP95LatencyMs)}
            tone={
              system.approximateP95LatencyMs > system.approximateEndToEndLatencyMs * 2
                ? '#f59e0b'
                : undefined
            }
          />

          {bottleneckLabel ? (
            <button
              type="button"
              onClick={() => setFocusedNode(system.bottleneckNodeId ?? null)}
              className="mt-1 flex w-full items-baseline justify-between gap-2 rounded-md bg-rose-500/10 px-2 py-1.5 text-left transition-colors hover:bg-rose-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sky-400"
            >
              <span className="text-[11px] text-rose-200/80">{t('system.bottleneck')}</span>
              <span className="truncate text-[11px] font-semibold text-rose-200">
                {bottleneckLabel}
              </span>
            </button>
          ) : null}
        </div>
      ) : (
        <p className="px-3 py-3 text-[11px] leading-snug text-faint">{t('system.idle')}</p>
      )}
    </section>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-baseline justify-between gap-2">
      <span className="text-[11px] text-muted">{label}</span>
      <span className="font-mono text-[11.5px] tabular-nums" style={{ color: tone }}>
        {value}
      </span>
    </div>
  );
}

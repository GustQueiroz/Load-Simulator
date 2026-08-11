'use client';

import { Eraser } from 'lucide-react';

import type { SimulationEvent, SimulationEventCode } from '@/application/simulation/event-log';
import { useT, type MessageKey, type Translate } from '@/i18n/I18nProvider';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { formatClock, formatCount, formatPercent, formatRps } from '@/lib/format';

const EVENT_MESSAGE: Record<SimulationEventCode, MessageKey> = {
  'status.warning': 'event.status.warning',
  'status.critical': 'event.status.critical',
  'status.recovered': 'event.status.recovered',
  'queue.building': 'event.queue.building',
  'queue.draining': 'event.queue.draining',
  'shedding.start': 'event.shedding.start',
  'shedding.stop': 'event.shedding.stop',
  'pool.hot': 'event.pool.hot',
  'button.fired': 'event.button.fired',
  'client.rampDone': 'event.client.rampDone',
  'client.spikeStart': 'event.client.spikeStart',
  'client.spikeEnd': 'event.client.spikeEnd',
};

export function EventLog() {
  const t = useT();
  const events = useSimulatorStore((state) => state.events);
  const clearEvents = useSimulatorStore((state) => state.clearEvents);

  return (
    <section className="rounded-xl border border-line bg-panel">
      <header className="flex items-center justify-between gap-2 border-b border-line/70 px-3 py-2">
        <h2 className="text-[10px] font-semibold tracking-wider text-faint uppercase">
          {t('events.title')}
        </h2>
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] text-muted transition-colors hover:bg-raised hover:text-ink disabled:opacity-40"
          disabled={events.length === 0}
          onClick={clearEvents}
          title={t('events.clear')}
        >
          <Eraser className="size-3" aria-hidden />
          {t('events.clear')}
        </button>
      </header>

      {events.length === 0 ? (
        <p className="px-3 py-3 text-[11px] leading-snug text-faint">{t('events.empty')}</p>
      ) : (
        <ol className="max-h-48 space-y-0 overflow-y-auto px-1 py-1" aria-live="polite">
          {events.map((event) => (
            <li
              key={event.id}
              className="flex gap-2 rounded-lg px-2 py-1.5 text-[11px] leading-snug text-muted hover:bg-raised/60"
            >
              <time className="shrink-0 font-mono text-[10px] text-faint tabular-nums">
                {formatClock(event.atSeconds)}
              </time>
              <span className="min-w-0 text-ink/90">{formatEvent(event, t)}</span>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}

function formatEvent(event: SimulationEvent, t: Translate): string {
  const label = event.nodeLabel ?? t('events.unknownNode');
  const params = event.params ?? {};
  return t(EVENT_MESSAGE[event.code], {
    node: label,
    utilization: formatPercent(params.utilization ?? 0),
    backlog: formatCount(params.backlog ?? 0),
    dropped: formatRps(params.dropped ?? 0),
    percent: formatPercent(params.percent ?? 0),
    rps: formatRps(params.rps ?? 0),
  });
}

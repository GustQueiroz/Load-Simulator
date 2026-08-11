'use client';

import { useT } from '@/i18n/I18nProvider';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';

/** Polite live region: text only changes on meaningful status transitions. */
export function SimulationAnnouncer() {
  const t = useT();
  const status = useSimulatorStore((state) => state.status);
  const bottleneckLabel = useSimulatorStore((state) => {
    const node = state.nodes.find((item) => item.id === state.system.bottleneckNodeId);
    return node?.data.config.label ?? null;
  });

  const parts: string[] = [];
  if (status === 'running') parts.push(t('a11y.sim.started'));
  else if (status === 'paused') parts.push(t('a11y.sim.paused'));
  else if (status === 'stopped') parts.push(t('a11y.sim.stopped'));
  if (bottleneckLabel) parts.push(t('a11y.sim.bottleneck', { node: bottleneckLabel }));

  return (
    <div className="sr-only" aria-live="polite" aria-atomic="true">
      {parts.join(' ')}
    </div>
  );
}

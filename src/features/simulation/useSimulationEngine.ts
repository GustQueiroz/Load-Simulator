'use client';

import { useEffect, useRef } from 'react';

import { SimulationEngine } from '@/application/simulation/engine';
import { SimulationScheduler } from '@/application/simulation/scheduler';
import { toSimulationEdges, toSimulationNodes } from '@/domain/diagram/diagram';
import { useT } from '@/i18n/I18nProvider';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { notify } from '@/infrastructure/store/toast-store';

/**
 * Hosts the engine and the single scheduler.
 *
 * Mounted exactly once, at the app shell. Nodes never own timers: one clock
 * produces one frame per tick, and that frame is committed in a single write.
 */
export function useSimulationEngine(): void {
  const t = useT();
  const engineRef = useRef<SimulationEngine | null>(null);
  const cycleReportedRef = useRef(false);

  if (engineRef.current === null) {
    engineRef.current = new SimulationEngine({ tickMs: useSimulatorStore.getState().tickMs });
  }

  const status = useSimulatorStore((state) => state.status);
  const tickMs = useSimulatorStore((state) => state.tickMs);
  const resetToken = useSimulatorStore((state) => state.resetToken);

  useEffect(() => {
    engineRef.current?.reset();
    cycleReportedRef.current = false;
  }, [resetToken]);

  useEffect(() => {
    if (status !== 'running') return;

    const engine = engineRef.current;
    if (!engine) return;
    engine.setTickMs(tickMs);

    const scheduler = new SimulationScheduler(() => {
      const state = useSimulatorStore.getState();
      const frame = engine.tick(toSimulationNodes(state.nodes), toSimulationEdges(state.edges));
      state.commitFrame(frame);

      if (frame.cycleNodeIds?.length && !cycleReportedRef.current) {
        cycleReportedRef.current = true;
        notify(t('error.cycle'), 'error');
      } else if (!frame.cycleNodeIds?.length) {
        cycleReportedRef.current = false;
      }
    }, tickMs);

    scheduler.start();
    return () => scheduler.stop();
  }, [status, tickMs, t]);
}

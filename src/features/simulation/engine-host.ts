import type { SimulationEngine } from '@/application/simulation/engine';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';

/**
 * The engine instance the UI can poke between ticks (a Button node injecting
 * clicks). Kept as module state because the press originates from a React tree
 * that has no path to the scheduler.
 */
let engineHost: SimulationEngine | null = null;

/**
 * Registers the running engine and returns a release function that only clears
 * the slot if it is still the engine it registered — so an unmount arriving
 * after a remount cannot unbind the live one.
 */
export function bindSimulationEngine(engine: SimulationEngine): () => void {
  engineHost = engine;
  return () => {
    if (engineHost === engine) engineHost = null;
  };
}

export function pressSimulatorButton(nodeId: string, clicks = 1): void {
  engineHost?.pressButton(nodeId, clicks);
  const state = useSimulatorStore.getState();

  if (state.status !== 'running') state.start();
}

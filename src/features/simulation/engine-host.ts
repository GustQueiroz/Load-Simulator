import type { SimulationEngine } from '@/application/simulation/engine';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';

let engineHost: SimulationEngine | null = null;

export function bindSimulationEngine(engine: SimulationEngine | null): void {
  engineHost = engine;
}

export function pressSimulatorButton(nodeId: string, clicks = 1): void {
  engineHost?.pressButton(nodeId, clicks);
  const state = useSimulatorStore.getState();

  if (state.status !== 'running') state.start();
}

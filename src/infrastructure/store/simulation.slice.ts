import type { StateCreator } from 'zustand';

import { DEFAULT_TICK_MS } from '@/application/simulation/engine';
import { createEmptySystemMetrics } from '@/domain/simulation/metrics';

import type { SimulationSlice, SimulatorState } from './types';

const EMPTY_NODE_METRICS = new Map();
const EMPTY_EDGE_METRICS = new Map();

export const createSimulationSlice: StateCreator<SimulatorState, [], [], SimulationSlice> = (
  set,
) => ({
  status: 'stopped',
  tick: 0,
  elapsedSeconds: 0,
  tickMs: DEFAULT_TICK_MS,
  resetToken: 0,
  nodeMetrics: EMPTY_NODE_METRICS,
  edgeMetrics: EMPTY_EDGE_METRICS,
  system: createEmptySystemMetrics(),
  cycleNodeIds: [],

  start: () => set({ status: 'running' }),

  // Pausing keeps every backlog and metric in place so the architecture can be
  // inspected — and edited — exactly as it was.
  pause: () => set({ status: 'paused' }),

  toggleRunning: () =>
    set((state) => ({ status: state.status === 'running' ? 'paused' : 'running' })),

  reset: () =>
    set((state) => ({
      status: 'stopped',
      tick: 0,
      elapsedSeconds: 0,
      resetToken: state.resetToken + 1,
      nodeMetrics: EMPTY_NODE_METRICS,
      edgeMetrics: EMPTY_EDGE_METRICS,
      system: createEmptySystemMetrics(),
      cycleNodeIds: [],
    })),

  /**
   * One commit per tick. The engine computes the whole frame in memory first;
   * writing it piecemeal would re-render the canvas dozens of times per tick.
   */
  commitFrame: (frame) =>
    set({
      tick: frame.tick,
      elapsedSeconds: frame.elapsedSeconds,
      nodeMetrics: frame.nodeMetrics,
      edgeMetrics: frame.edgeMetrics,
      system: frame.system,
      cycleNodeIds: frame.cycleNodeIds ?? [],
    }),

  setTickMs: (tickMs) => {
    if (tickMs > 0) set({ tickMs });
  },
});

import type { StateCreator } from 'zustand';

import { DEFAULT_TICK_MS } from '@/application/simulation/engine';
import { MAX_EVENT_LOG } from '@/application/simulation/event-log';
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
  events: [],

  start: () => set({ status: 'running' }),

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
      events: [],
    })),

  commitFrame: (frame) =>
    set((state) => {
      const merged =
        frame.events.length === 0
          ? state.events
          : [...frame.events, ...state.events].slice(0, MAX_EVENT_LOG);
      return {
        tick: frame.tick,
        elapsedSeconds: frame.elapsedSeconds,
        nodeMetrics: frame.nodeMetrics,
        edgeMetrics: frame.edgeMetrics,
        system: frame.system,
        cycleNodeIds: frame.cycleNodeIds ?? [],
        events: merged,
      };
    }),

  clearEvents: () => set({ events: [] }),

  setTickMs: (tickMs) => {
    if (tickMs > 0) set({ tickMs });
  },
});

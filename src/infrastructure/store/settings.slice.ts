import type { StateCreator } from 'zustand';

import type { PresentationSlice, SettingsSlice, SimulatorState } from './types';

export const createSettingsSlice: StateCreator<SimulatorState, [], [], SettingsSlice> = (set) => ({
  cloud: 'aws',
  showEdgeLabels: true,
  showMinimap: true,

  setCloud: (cloud) => set({ cloud }),
  toggleEdgeLabels: () => set((state) => ({ showEdgeLabels: !state.showEdgeLabels })),
  toggleMinimap: () => set((state) => ({ showMinimap: !state.showMinimap })),
});

export const createPresentationSlice: StateCreator<SimulatorState, [], [], PresentationSlice> = (
  set,
) => ({
  presentationMode: false,
  focusedNodeId: null,

  togglePresentationMode: () =>
    set((state) => ({ presentationMode: !state.presentationMode, focusedNodeId: null })),
  setPresentationMode: (enabled) => set({ presentationMode: enabled, focusedNodeId: null }),
  setFocusedNode: (id) => set({ focusedNodeId: id }),
});

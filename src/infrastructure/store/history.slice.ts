import type { StateCreator } from 'zustand';

import {
  cloneCheckpoint,
  MAX_DIAGRAM_HISTORY,
  type DiagramCheckpoint,
} from './history';
import type { SimulatorState } from './types';

export interface HistorySlice {
  past: DiagramCheckpoint[];
  future: DiagramCheckpoint[];
  /** Snapshot current nodes/edges before a mutating edit. */
  pushHistory: () => void;
  undo: () => boolean;
  redo: () => boolean;
  clearHistory: () => void;
}

export const createHistorySlice: StateCreator<SimulatorState, [], [], HistorySlice> = (set, get) => ({
  past: [],
  future: [],

  pushHistory: () => {
    const { nodes, edges, past } = get();
    const checkpoint = cloneCheckpoint(nodes, edges);
    const last = past[past.length - 1];
    if (last && checkpointsEqual(last, checkpoint)) return;

    const nextPast = [...past, checkpoint];
    if (nextPast.length > MAX_DIAGRAM_HISTORY) nextPast.shift();
    set({ past: nextPast, future: [] });
    armConfigHistory();
  },

  undo: () => {
    const { past, future, nodes, edges } = get();
    const previous = past[past.length - 1];
    if (!previous) return false;

    const current = cloneCheckpoint(nodes, edges);
    set({
      past: past.slice(0, -1),
      future: [...future, current],
      nodes: previous.nodes,
      edges: previous.edges,
      isDirty: true,
    });
    armConfigHistory();
    return true;
  },

  redo: () => {
    const { past, future, nodes, edges } = get();
    const next = future[future.length - 1];
    if (!next) return false;

    const current = cloneCheckpoint(nodes, edges);
    const nextPast = [...past, current];
    if (nextPast.length > MAX_DIAGRAM_HISTORY) nextPast.shift();

    set({
      past: nextPast,
      future: future.slice(0, -1),
      nodes: next.nodes,
      edges: next.edges,
      isDirty: true,
    });
    armConfigHistory();
    return true;
  },

  clearHistory: () => {
    set({ past: [], future: [] });
    armConfigHistory();
  },
});

function checkpointsEqual(a: DiagramCheckpoint, b: DiagramCheckpoint): boolean {
  return a.nodes === b.nodes && a.edges === b.edges
    ? true
    : JSON.stringify(a.nodes) === JSON.stringify(b.nodes) &&
        JSON.stringify(a.edges) === JSON.stringify(b.edges);
}

/** Coalesce rapid slider edits into a single history entry. */
let configHistoryReady = true;
let configHistoryTimer: ReturnType<typeof setTimeout> | null = null;

export function pushHistoryForConfigEdit(pushHistory: () => void): void {
  if (configHistoryReady) {
    pushHistory();
    configHistoryReady = false;
  }
  if (configHistoryTimer) clearTimeout(configHistoryTimer);
  configHistoryTimer = setTimeout(() => {
    configHistoryReady = true;
    configHistoryTimer = null;
  }, 450);
}

function armConfigHistory(): void {
  configHistoryReady = true;
  if (configHistoryTimer) {
    clearTimeout(configHistoryTimer);
    configHistoryTimer = null;
  }
}

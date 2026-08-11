'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { createEmptyEdgeMetrics, createEmptyMetrics } from '@/domain/simulation/metrics';
import type { EdgeMetrics, NodeMetrics } from '@/domain/simulation/metrics';

import { createDiagramSlice } from './diagram.slice';
import { createPresentationSlice, createSettingsSlice } from './settings.slice';
import { createSimulationSlice } from './simulation.slice';
import type { SimulatorState } from './types';

/**
 * Single store, split into slices by concern. The canvas, the toolbar, the
 * panels and the engine host all read from here — and nothing else does the
 * arithmetic: the store holds state and receives finished frames.
 */
export const useSimulatorStore = create<SimulatorState>()(
  // `subscribeWithSelector` lets autosave watch the diagram only — without it,
  // every simulation tick would look like a change worth persisting.
  subscribeWithSelector((...args) => ({
    ...createDiagramSlice(...args),
    ...createSimulationSlice(...args),
    ...createSettingsSlice(...args),
    ...createPresentationSlice(...args),
  })),
);

/** Stable fallbacks: a selector must never allocate, or it re-renders forever. */
const IDLE_NODE_METRICS: NodeMetrics = Object.freeze(createEmptyMetrics());
const IDLE_EDGE_METRICS: EdgeMetrics = Object.freeze(createEmptyEdgeMetrics());

export function useNodeMetrics(nodeId: string): NodeMetrics {
  return useSimulatorStore((state) => state.nodeMetrics.get(nodeId) ?? IDLE_NODE_METRICS);
}

export function useEdgeMetrics(edgeId: string): EdgeMetrics {
  return useSimulatorStore((state) => state.edgeMetrics.get(edgeId) ?? IDLE_EDGE_METRICS);
}


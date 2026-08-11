'use client';

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';

import { createEmptyEdgeMetrics, createEmptyMetrics } from '@/domain/simulation/metrics';
import type { EdgeMetrics, NodeMetrics } from '@/domain/simulation/metrics';

import { createDiagramSlice } from './diagram.slice';
import { createPresentationSlice, createSettingsSlice } from './settings.slice';
import { createSimulationSlice } from './simulation.slice';
import type { SimulatorState } from './types';

export const useSimulatorStore = create<SimulatorState>()(

  subscribeWithSelector((...args) => ({
    ...createDiagramSlice(...args),
    ...createSimulationSlice(...args),
    ...createSettingsSlice(...args),
    ...createPresentationSlice(...args),
  })),
);

const IDLE_NODE_METRICS: NodeMetrics = Object.freeze(createEmptyMetrics());
const IDLE_EDGE_METRICS: EdgeMetrics = Object.freeze(createEmptyEdgeMetrics());

export function useNodeMetrics(nodeId: string): NodeMetrics {
  return useSimulatorStore((state) => state.nodeMetrics.get(nodeId) ?? IDLE_NODE_METRICS);
}

export function useEdgeMetrics(edgeId: string): EdgeMetrics {
  return useSimulatorStore((state) => state.edgeMetrics.get(edgeId) ?? IDLE_EDGE_METRICS);
}


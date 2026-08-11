import type { StateCreator } from 'zustand';

import {
  DEFAULT_VIEWPORT,
  nextLabelFor,
  toSimulationEdges,
  toSimulationNodes,
  type DiagramNode,
} from '@/domain/diagram/diagram';
import type { SimulatorNodeData } from '@/domain/nodes/config';
import { createDefaultConfig } from '@/domain/nodes/defaults';
import { mergeSimulatorNodeConfig } from '@/domain/nodes/merge-config';
import { validateConnection } from '@/domain/simulation/connection-rules';
import { createEdgeId, createNodeId } from '@/lib/ids';

import { pushHistoryForConfigEdit } from './history.slice';
import type { DiagramSlice, SimulatorState } from './types';

const NODE_WIDTH = 280;
const DUPLICATE_OFFSET = 48;

export const createDiagramSlice: StateCreator<SimulatorState, [], [], DiagramSlice> = (
  set,
  get,
) => ({
  name: 'Nova arquitetura',
  createdAt: new Date().toISOString(),
  nodes: [],
  edges: [],
  viewport: DEFAULT_VIEWPORT,
  isDirty: false,
  fitViewToken: 0,

  setNodes: (nodes, markDirty = true) =>
    set(markDirty ? { nodes, isDirty: true } : { nodes }),
  setEdges: (edges, markDirty = true) =>
    set(markDirty ? { edges, isDirty: true } : { edges }),
  requestFitView: () => set((state) => ({ fitViewToken: state.fitViewToken + 1 })),

  addNode: (kind, position, labelPrefix) => {
    get().pushHistory();
    const id = createNodeId(kind);
    const label = nextLabelFor(get().nodes, kind, labelPrefix);
    const node: DiagramNode = {
      id,
      type: kind,
      position: { x: position.x - NODE_WIDTH / 2, y: position.y },
      data: { kind, config: createDefaultConfig(kind, label) } as SimulatorNodeData,
    };

    set((state) => ({ nodes: [...state.nodes, node], isDirty: true }));
    return id;
  },

  updateNodeConfig: (id, patch) => {
    pushHistoryForConfigEdit(() => get().pushHistory());
    set((state) => ({
      nodes: state.nodes.map((node) => {
        if (node.id !== id) return node;
        return { ...node, data: mergeSimulatorNodeConfig(node.data, patch) };
      }),
      isDirty: true,
    }));
  },

  duplicateNode: (id, labelPrefix) => {
    const source = get().nodes.find((node) => node.id === id);
    if (!source) return;

    get().pushHistory();
    const kind = source.data.kind;
    const copy: DiagramNode = {
      id: createNodeId(kind),
      type: kind,
      position: {
        x: source.position.x + DUPLICATE_OFFSET,
        y: source.position.y + DUPLICATE_OFFSET,
      },
      data: {
        kind,
        config: {
          ...structuredClone(source.data.config),
          label: nextLabelFor(get().nodes, kind, labelPrefix),
        },
      } as SimulatorNodeData,
      selected: false,
    };

    set((state) => ({ nodes: [...state.nodes, copy], isDirty: true }));
  },

  removeNodes: (ids) => {
    if (ids.length === 0) return;
    get().pushHistory();
    const removed = new Set(ids);
    set((state) => ({
      nodes: state.nodes.filter((node) => !removed.has(node.id)),
      edges: state.edges.filter(
        (edge) => !removed.has(edge.source) && !removed.has(edge.target),
      ),
      isDirty: true,
    }));
  },

  connect: (candidate) => {
    const { nodes, edges } = get();
    const validation = validateConnection({
      candidate,
      nodesById: new Map(toSimulationNodes(nodes).map((node) => [node.id, node])),
      edges: toSimulationEdges(edges),
    });
    if (!validation.valid) return validation;

    get().pushHistory();
    set((state) => ({
      edges: [
        ...state.edges,
        {
          id: createEdgeId(candidate.source, candidate.target),
          source: candidate.source,
          target: candidate.target,
          sourceHandle: candidate.sourceHandle ?? null,
          targetHandle: candidate.targetHandle ?? null,
          data: { enabled: true },
        },
      ],
      isDirty: true,
    }));

    return validation;
  },

  setViewport: (viewport) => set({ viewport }),

  loadSnapshot: (snapshot, name, createdAt) =>
    set({
      nodes: snapshot.nodes,
      edges: snapshot.edges,
      viewport: snapshot.viewport ?? DEFAULT_VIEWPORT,
      name,
      createdAt: createdAt ?? new Date().toISOString(),
      isDirty: false,
    }),

  clearDiagram: () => {
    get().pushHistory();
    set({
      nodes: [],
      edges: [],
      name: 'Nova arquitetura',
      createdAt: new Date().toISOString(),
      isDirty: false,
    });
  },

  setName: (name) => set({ name, isDirty: true }),
  markSaved: () => set({ isDirty: false }),

  selectNode: (id) =>
    set((state) => ({
      nodes: state.nodes.map((node) => ({ ...node, selected: id !== null && node.id === id })),
      edges: state.edges.map((edge) => ({ ...edge, selected: false })),
    })),

  selectEdge: (id) =>
    set((state) => ({
      nodes: state.nodes.map((node) => ({ ...node, selected: false })),
      edges: state.edges.map((edge) => ({ ...edge, selected: id !== null && edge.id === id })),
    })),
});

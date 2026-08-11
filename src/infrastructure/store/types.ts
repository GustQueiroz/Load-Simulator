import type { CloudProvider } from '@/application/cost/types';
import type { SimulationFrame } from '@/application/simulation/engine';
import type {
  DiagramEdge,
  DiagramNode,
  DiagramPosition,
  DiagramSnapshot,
  DiagramViewport,
} from '@/domain/diagram/diagram';
import type { AnyNodeConfig } from '@/domain/nodes/config';
import type { ConnectionCandidate, ConnectionValidation } from '@/domain/simulation/connection-rules';
import type { EdgeMetrics, NodeMetrics, SystemMetrics } from '@/domain/simulation/metrics';
import type { NodeKind } from '@/domain/simulation/node-kind';

export type SimulationStatus = 'stopped' | 'running' | 'paused';

export interface DiagramSlice {
  name: string;
  createdAt: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  viewport: DiagramViewport;
  /** True when there are changes that have not been exported yet. */
  isDirty: boolean;

  /** Incremented to ask the canvas to reframe the diagram. */
  fitViewToken: number;

  /** `markDirty` is false for cosmetic changes such as selection. */
  setNodes: (nodes: DiagramNode[], markDirty?: boolean) => void;
  setEdges: (edges: DiagramEdge[], markDirty?: boolean) => void;
  requestFitView: () => void;
  /** `labelPrefix` is the localized kind name — labels are data, not UI copy. */
  addNode: (kind: NodeKind, position: DiagramPosition, labelPrefix: string) => string;
  updateNodeConfig: (id: string, patch: Partial<AnyNodeConfig>) => void;
  duplicateNode: (id: string, labelPrefix: string) => void;
  removeNodes: (ids: readonly string[]) => void;
  connect: (candidate: ConnectionCandidate) => ConnectionValidation;
  setViewport: (viewport: DiagramViewport) => void;
  loadSnapshot: (snapshot: DiagramSnapshot, name: string, createdAt?: string) => void;
  clearDiagram: () => void;
  setName: (name: string) => void;
  markSaved: () => void;
}

export interface SimulationSlice {
  status: SimulationStatus;
  tick: number;
  elapsedSeconds: number;
  tickMs: number;
  /** Incremented on reset so the engine host knows to drop its runtime state. */
  resetToken: number;
  nodeMetrics: ReadonlyMap<string, NodeMetrics>;
  edgeMetrics: ReadonlyMap<string, EdgeMetrics>;
  system: SystemMetrics;
  cycleNodeIds: readonly string[];

  start: () => void;
  pause: () => void;
  toggleRunning: () => void;
  reset: () => void;
  commitFrame: (frame: SimulationFrame) => void;
  setTickMs: (tickMs: number) => void;
}

export interface SettingsSlice {
  cloud: CloudProvider;
  showEdgeLabels: boolean;
  showMinimap: boolean;
  setCloud: (cloud: CloudProvider) => void;
  toggleEdgeLabels: () => void;
  toggleMinimap: () => void;
}

export interface PresentationSlice {
  presentationMode: boolean;
  focusedNodeId: string | null;
  togglePresentationMode: () => void;
  setPresentationMode: (enabled: boolean) => void;
  setFocusedNode: (id: string | null) => void;
}

export type SimulatorState = DiagramSlice & SimulationSlice & SettingsSlice & PresentationSlice;

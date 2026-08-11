'use client';

import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import { useCallback } from 'react';

import type { DiagramEdge, DiagramNode } from '@/domain/diagram/diagram';
import type { ConnectionRejection } from '@/domain/simulation/connection-rules';
import { useT, type MessageKey } from '@/i18n/I18nProvider';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { notify } from '@/infrastructure/store/toast-store';

/**
 * Adapter between React Flow's change events and the store.
 *
 * This is the *only* place that knows React Flow's change protocol; the store
 * below it just receives plain arrays.
 */
/** Rejection code → phrasing. A new rule cannot ship without a message. */
const CONNECTION_MESSAGE: Record<ConnectionRejection, MessageKey> = {
  'unknown-endpoint': 'error.connection.unknownEndpoint',
  'self-loop': 'error.connection.selfLoop',
  duplicate: 'error.connection.duplicate',
  'client-inbound': 'error.connection.clientInbound',
  cycle: 'error.connection.cycle',
};

export function useDiagramSync() {
  const t = useT();
  const setNodes = useSimulatorStore((state) => state.setNodes);
  const setEdges = useSimulatorStore((state) => state.setEdges);
  const connect = useSimulatorStore((state) => state.connect);

  const onNodesChange = useCallback(
    (changes: NodeChange<DiagramNode>[]) => {
      const { nodes } = useSimulatorStore.getState();
      setNodes(applyNodeChanges(changes, nodes), changes.some(isStructuralNodeChange));
    },
    [setNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<DiagramEdge>[]) => {
      const { edges } = useSimulatorStore.getState();
      setEdges(applyEdgeChanges(changes, edges), changes.some(isStructuralEdgeChange));
    },
    [setEdges],
  );

  const onConnect = useCallback(
    (connection: Connection) => {
      const result = connect({
        source: connection.source,
        target: connection.target,
        sourceHandle: connection.sourceHandle,
        targetHandle: connection.targetHandle,
      });
      if (!result.valid) notify(t(CONNECTION_MESSAGE[result.reason]), 'error');
    },
    [connect, t],
  );

  return { onNodesChange, onEdgesChange, onConnect };
}

/** Selecting or measuring a node is not an edit worth marking as unsaved. */
function isStructuralNodeChange(change: NodeChange<DiagramNode>): boolean {
  return change.type !== 'select' && change.type !== 'dimensions';
}

function isStructuralEdgeChange(change: EdgeChange<DiagramEdge>): boolean {
  return change.type !== 'select';
}

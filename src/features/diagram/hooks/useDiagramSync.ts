'use client';

import {
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type EdgeChange,
  type NodeChange,
} from '@xyflow/react';
import { useCallback, useRef } from 'react';

import type { DiagramEdge, DiagramNode } from '@/domain/diagram/diagram';
import type { ConnectionRejection } from '@/domain/simulation/connection-rules';
import { useT, type MessageKey } from '@/i18n/I18nProvider';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';
import { notify } from '@/infrastructure/store/toast-store';

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
  const pushHistory = useSimulatorStore((state) => state.pushHistory);
  const nodeDragHistoryPushed = useRef(false);
  const structuralPushArmed = useRef(true);

  const pushStructuralHistory = useCallback(() => {
    if (!structuralPushArmed.current) return;
    structuralPushArmed.current = false;
    pushHistory();
    queueMicrotask(() => {
      structuralPushArmed.current = true;
    });
  }, [pushHistory]);

  const onNodesChange = useCallback(
    (changes: NodeChange<DiagramNode>[]) => {
      const removes = changes.some((change) => change.type === 'remove');
      const dragStart = changes.some(
        (change) => change.type === 'position' && change.dragging === true,
      );
      const dragEnd = changes.some(
        (change) => change.type === 'position' && change.dragging === false,
      );

      if (removes) {
        pushStructuralHistory();
        nodeDragHistoryPushed.current = false;
      } else if (dragStart && !nodeDragHistoryPushed.current) {
        pushHistory();
        nodeDragHistoryPushed.current = true;
      }

      if (dragEnd) nodeDragHistoryPushed.current = false;

      const { nodes } = useSimulatorStore.getState();
      setNodes(applyNodeChanges(changes, nodes), changes.some(isStructuralNodeChange));
    },
    [pushHistory, pushStructuralHistory, setNodes],
  );

  const onEdgesChange = useCallback(
    (changes: EdgeChange<DiagramEdge>[]) => {
      if (changes.some((change) => change.type === 'remove')) {
        pushStructuralHistory();
      }
      const { edges } = useSimulatorStore.getState();
      setEdges(applyEdgeChanges(changes, edges), changes.some(isStructuralEdgeChange));
    },
    [pushStructuralHistory, setEdges],
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

function isStructuralNodeChange(change: NodeChange<DiagramNode>): boolean {
  return change.type !== 'select' && change.type !== 'dimensions';
}

function isStructuralEdgeChange(change: EdgeChange<DiagramEdge>): boolean {
  return change.type !== 'select';
}

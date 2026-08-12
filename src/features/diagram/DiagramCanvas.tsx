'use client';

import {
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  useNodesInitialized,
  useReactFlow,
  type DefaultEdgeOptions,
} from '@xyflow/react';
import { useCallback, useEffect, useRef, type DragEvent } from 'react';

import type { DiagramEdge, DiagramNode } from '@/domain/diagram/diagram';
import { isNodeKind } from '@/domain/simulation/node-kind';
import { useT } from '@/i18n/I18nProvider';
import { kindKey } from '@/i18n/keys';
import { useSimulatorStore } from '@/infrastructure/store/simulator-store';

import { ComponentPalette, PALETTE_DRAG_TYPE } from './ComponentPalette';
import { EDGE_TYPES } from './edges/TrafficEdge';
import { EmptyCanvasHint } from './EmptyCanvasHint';
import { useCanvasKeyboard } from './hooks/useCanvasKeyboard';
import { useDiagramSync } from './hooks/useDiagramSync';
import { KeyboardLinkBanner } from './KeyboardLinkBanner';
import { NODE_TYPES } from './nodes';
import { KIND_THEME } from './nodes/node-theme';

const DEFAULT_EDGE_OPTIONS: DefaultEdgeOptions = { type: 'traffic' };
const MINIMAP_MASK = 'rgba(8, 17, 31, 0.75)';

export function DiagramCanvas() {
  const nodes = useSimulatorStore((state) => state.nodes);
  const edges = useSimulatorStore((state) => state.edges);
  const viewport = useSimulatorStore((state) => state.viewport);
  const showMinimap = useSimulatorStore((state) => state.showMinimap);
  const presenting = useSimulatorStore((state) => state.presentationMode);
  const focusedNodeId = useSimulatorStore((state) => state.focusedNodeId);
  const fitViewToken = useSimulatorStore((state) => state.fitViewToken);
  const addNode = useSimulatorStore((state) => state.addNode);
  const setViewport = useSimulatorStore((state) => state.setViewport);
  const setFocusedNode = useSimulatorStore((state) => state.setFocusedNode);

  const t = useT();
  const { onNodesChange, onEdgesChange, onConnect } = useDiagramSync();
  const keyboard = useCanvasKeyboard(onConnect, !presenting);
  const { screenToFlowPosition, fitView } = useReactFlow();
  const nodesInitialized = useNodesInitialized();
  const hasFirstFrame = useSimulatorStore((state) => state.tick > 0);
  // Set only by pan/zoom the learner performed — `fitView` also fires
  // `onMoveEnd`, but with no source event.
  const viewportMovedByUser = useRef(false);

  useEffect(() => {

    if (fitViewToken === 0 || !nodesInitialized) return;
    viewportMovedByUser.current = false;
    void fitView({ padding: 0.18, duration: 350 });
  }, [fitViewToken, nodesInitialized, fitView]);

  /**
   * Cards grow when the metric block appears on the first frame. Reframe once,
   * so the diagram that was fitted while stopped does not spill out of view the
   * moment the learner presses play.
   *
   * Only while the viewport is still the one we framed: if the learner has
   * panned or zoomed since, that is a deliberate choice and we leave it alone.
   */
  useEffect(() => {
    if (!hasFirstFrame || !nodesInitialized || viewportMovedByUser.current) return;
    const timer = setTimeout(() => {
      if (!viewportMovedByUser.current) void fitView({ padding: 0.18, duration: 350 });
    }, 120);
    return () => clearTimeout(timer);
  }, [hasFirstFrame, nodesInitialized, fitView]);

  useEffect(() => {
    if (!focusedNodeId) return;
    void fitView({ nodes: [{ id: focusedNodeId }], padding: 0.55, duration: 400, maxZoom: 1.35 });
  }, [focusedNodeId, fitView]);

  const onDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (Array.from(event.dataTransfer.types).includes('Files')) return;

      event.preventDefault();
      const kind = event.dataTransfer.getData(PALETTE_DRAG_TYPE);
      if (!isNodeKind(kind)) return;
      addNode(kind, screenToFlowPosition({ x: event.clientX, y: event.clientY }), t(kindKey(kind)));
    },
    [addNode, screenToFlowPosition, t],
  );

  const onDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    if (Array.from(event.dataTransfer.types).includes('Files')) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div
      className="relative h-full w-full"
      onDrop={onDrop}
      onDragOver={onDragOver}
      onKeyDown={keyboard.onKeyDown}
    >
      <ReactFlow<DiagramNode, DiagramEdge>
        nodes={nodes}
        edges={edges}
        nodeTypes={NODE_TYPES}
        edgeTypes={EDGE_TYPES}
        defaultEdgeOptions={DEFAULT_EDGE_OPTIONS}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onMoveEnd={(event, next) => {
          if (event) viewportMovedByUser.current = true;
          setViewport(next);
        }}
        onNodeDoubleClick={(_, node) => presenting && setFocusedNode(node.id)}
        onPaneClick={() => focusedNodeId && setFocusedNode(null)}
        defaultViewport={viewport}
        minZoom={0.15}
        maxZoom={2}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        nodesDraggable={!presenting}
        nodesConnectable={!presenting}
        elementsSelectable={!presenting}
        deleteKeyCode={['Backspace', 'Delete']}
        proOptions={{ hideAttribution: true }}
        className={presenting ? 'presenting' : undefined}
      >
        <Background variant={BackgroundVariant.Dots} gap={24} size={1.4} color="#22304a" />
        <Controls
          className="!border-line !bg-panel/90 !shadow-xl max-lg:!mb-14"
          showInteractive={!presenting}
          position="bottom-right"
        />
        {showMinimap ? (
          <MiniMap
            pannable
            zoomable
            position="bottom-left"
            maskColor={MINIMAP_MASK}
            nodeColor={(node) => KIND_THEME[(node.type ?? 'server') as keyof typeof KIND_THEME].accent}
            nodeStrokeWidth={0}
            className="max-md:!hidden"
            style={{ width: 168, height: 112 }}
          />
        ) : null}

        {!presenting ? (
          <Panel position="top-left" className="!m-2 max-md:!m-1.5 md:!m-3">
            <ComponentPalette />
          </Panel>
        ) : null}

        {nodes.length === 0 ? (
          <Panel position="top-center" className="!mt-24">
            <EmptyCanvasHint />
          </Panel>
        ) : null}

        {keyboard.link ? (
          <Panel position="top-center" className="!mt-2">
            <KeyboardLinkBanner link={keyboard.link} onCancel={keyboard.cancelLink} />
          </Panel>
        ) : null}
      </ReactFlow>
    </div>
  );
}

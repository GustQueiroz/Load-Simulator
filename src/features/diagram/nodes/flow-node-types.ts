import type { Node } from '@xyflow/react';

import type { SimulatorNodeData } from '@/domain/nodes/config';
import type { NodeKind } from '@/domain/simulation/node-kind';

/** The data carried by a node of kind `K`. */
export type NodeDataOf<K extends NodeKind> = Extract<SimulatorNodeData, { kind: K }>;

/** React Flow node type for kind `K`. */
export type FlowNodeOf<K extends NodeKind> = Node<NodeDataOf<K>, K>;

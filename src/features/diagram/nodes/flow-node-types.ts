import type { Node } from '@xyflow/react';

import type { SimulatorNodeData } from '@/domain/nodes/config';
import type { NodeKind } from '@/domain/simulation/node-kind';

export type NodeDataOf<K extends NodeKind> = Extract<SimulatorNodeData, { kind: K }>;

export type FlowNodeOf<K extends NodeKind> = Node<NodeDataOf<K>, K>;

import { nanoid } from 'nanoid';

import type { NodeKind } from '@/domain/simulation/node-kind';

export function createNodeId(kind: NodeKind): string {
  return `${kind}_${nanoid(10)}`;
}

export function createEdgeId(source: string, target: string): string {
  return `edge_${source}__${target}`;
}

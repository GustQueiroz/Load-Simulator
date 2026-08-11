import { nanoid } from 'nanoid';

import type { NodeKind } from '@/domain/simulation/node-kind';

/**
 * Ids are opaque and permanent. A label is a display concern and must never be
 * used as an identifier — renaming a node cannot break its edges.
 */
export function createNodeId(kind: NodeKind): string {
  return `${kind}_${nanoid(10)}`;
}

export function createEdgeId(source: string, target: string): string {
  return `edge_${source}__${target}`;
}

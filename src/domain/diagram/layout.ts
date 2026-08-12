import type { NodeKind } from '../simulation/node-kind';
import type { DiagramNode } from './diagram';

export const NODE_WIDTH = 264;

/**
 * Height a card occupies **while the simulation is running**, in flow units.
 *
 * The running state is the one that matters: a card grows by roughly 40% once
 * the metric block appears, and a layout measured on the stopped card lets the
 * rows collide the moment the learner presses play.
 *
 * Values are measured from the rendered cards and rounded up, with headroom
 * for the "probable bottleneck" badge, which any node can show.
 */
export const RUNNING_NODE_HEIGHT: Record<NodeKind, number> = {
  client: 320,
  button: 320,
  loadBalancer: 340,
  apiGateway: 360,
  server: 470,
  cache: 380,
  messageQueue: 360,
  database: 420,
};

/** Vertical breathing room between two rows, enough for an edge label. */
export const ROW_GAP = 56;

export const COL = 340;

export const col = (index: number) => index * COL;

/**
 * Nominal row slots. Diagrams author positions against these; `stackRows`
 * then compacts them to what each row actually needs.
 */
export const ROWS = [0, 320, 760, 1_200, 1_640] as const;

/**
 * Re-stacks rows so no two cards can overlap once the simulation is running.
 *
 * Nodes sharing a `y` are one row. Each row is placed right below the tallest
 * card of the previous one, which keeps a row of clients compact and still
 * gives a row of servers the space it needs — a single worst-case pitch would
 * have to assume "server" everywhere and shrink the whole diagram.
 *
 * Pure and order-preserving: x, ids and data are untouched.
 */
export function stackRows(nodes: readonly DiagramNode[], gap = ROW_GAP): DiagramNode[] {
  if (nodes.length === 0) return [];

  const levels = [...new Set(nodes.map((node) => node.position.y))].sort((a, b) => a - b);
  const resolved = new Map<number, number>();

  let cursor = levels[0] ?? 0;
  for (const level of levels) {
    resolved.set(level, cursor);
    const tallest = nodes
      .filter((node) => node.position.y === level)
      .reduce((max, node) => Math.max(max, RUNNING_NODE_HEIGHT[node.data.kind]), 0);
    cursor += tallest + gap;
  }

  return nodes.map((node) => ({
    ...node,
    position: { ...node.position, y: resolved.get(node.position.y) ?? node.position.y },
  }));
}

/** Bounding box of a node while running — used by layout tests. */
export function runningBounds(node: DiagramNode) {
  return {
    id: node.id,
    left: node.position.x,
    right: node.position.x + NODE_WIDTH,
    top: node.position.y,
    bottom: node.position.y + RUNNING_NODE_HEIGHT[node.data.kind],
  };
}

export function findOverlaps(nodes: readonly DiagramNode[]): string[] {
  const boxes = nodes.map(runningBounds);
  const overlaps: string[] = [];

  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      const a = boxes[i];
      const b = boxes[j];
      const horizontal = a.left < b.right && b.left < a.right;
      const vertical = a.top < b.bottom && b.top < a.bottom;
      if (horizontal && vertical) overlaps.push(`${a.id} ↔ ${b.id}`);
    }
  }

  return overlaps;
}

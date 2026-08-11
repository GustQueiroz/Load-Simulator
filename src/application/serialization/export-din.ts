import type { DiagramEdge, DiagramNode, DiagramViewport } from '@/domain/diagram/diagram';

import { DIN_CURRENT_VERSION, DIN_SCHEMA_ID, type DinFile } from './din.schema';

export const APP_VERSION = '0.1.0';

export interface ExportInput {
  name: string;
  nodes: readonly DiagramNode[];
  edges: readonly DiagramEdge[];
  viewport: DiagramViewport;
  settings: DinFile['settings'];
  createdAt?: string;
  now: string;
}

export function exportDin(input: ExportInput): DinFile {
  return {
    schema: DIN_SCHEMA_ID,
    version: DIN_CURRENT_VERSION,
    metadata: {
      name: input.name,
      createdAt: input.createdAt ?? input.now,
      updatedAt: input.now,
      appVersion: APP_VERSION,
    },
    viewport: {
      x: round(input.viewport.x),
      y: round(input.viewport.y),
      zoom: round(input.viewport.zoom, 4),
    },
    settings: input.settings,
    nodes: input.nodes.map((node) => ({
      id: node.id,
      type: node.data.kind,
      position: { x: round(node.position.x), y: round(node.position.y) },
      data: node.data,
    })),
    edges: input.edges.map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? null,
      enabled: edge.data?.enabled ?? true,
    })),
  };
}

export function serializeDin(file: DinFile): string {
  return `${JSON.stringify(file, null, 2)}\n`;
}

function round(value: number, decimals = 2): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}

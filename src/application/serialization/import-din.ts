import type { SimulatorNodeData } from '@/domain/nodes/config';
import type { DiagramEdge, DiagramNode, DiagramViewport } from '@/domain/diagram/diagram';
import { isNodeKind } from '@/domain/simulation/node-kind';

import { dinFileSchema, type DinFile } from './din.schema';
import type { ImportFailure } from './import-error';
import { migrateToCurrent } from './migrations';

export interface ImportedDiagram {
  name: string;
  nodes: DiagramNode[];
  edges: DiagramEdge[];
  viewport: DiagramViewport;
  settings: DinFile['settings'];
  createdAt: string;
}

export type ImportResult =
  | { ok: true; diagram: ImportedDiagram }
  | { ok: false; error: ImportFailure };

export function importDin(rawText: string): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(rawText);
  } catch {
    return { ok: false, error: { code: 'invalid-json' } };
  }

  const migrated = migrateToCurrent(parsed);
  if (!migrated.ok) return { ok: false, error: migrated.error };

  const validated = dinFileSchema.safeParse(migrated.document);
  if (!validated.success) {
    const issue = validated.error.issues[0];
    return {
      ok: false,
      error: issue
        ? { code: 'schema', path: issue.path.map(String).join('.') || undefined, detail: issue.message }
        : { code: 'invalid' },
    };
  }

  const file = validated.data;
  const nodes: DiagramNode[] = [];
  for (const node of file.nodes) {
    if (!isNodeKind(node.data.kind)) {
      return { ok: false, error: { code: 'unknown-kind', kind: String(node.data.kind) } };
    }
    nodes.push({
      id: node.id,
      type: node.data.kind,
      position: node.position,

      data: node.data as SimulatorNodeData,
    });
  }

  const knownIds = new Set(nodes.map((node) => node.id));
  const edges: DiagramEdge[] = file.edges
    .filter((edge) => knownIds.has(edge.source) && knownIds.has(edge.target))
    .map((edge) => ({
      id: edge.id,
      source: edge.source,
      target: edge.target,
      sourceHandle: edge.sourceHandle ?? null,
      targetHandle: edge.targetHandle ?? null,
      data: { enabled: edge.enabled },
    }));

  return {
    ok: true,
    diagram: {
      name: file.metadata.name,
      nodes,
      edges,
      viewport: file.viewport,
      settings: file.settings,
      createdAt: file.metadata.createdAt,
    },
  };
}

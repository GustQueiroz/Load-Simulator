import { exportDin, serializeDin, type ExportInput } from '@/application/serialization/export-din';
import { importDin, type ImportedDiagram } from '@/application/serialization/import-din';

const STORAGE_KEY = 'system-design-simulator:last-project';

export function saveLastProject(input: ExportInput): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, serializeDin(exportDin(input)));
  } catch {

  }
}

export function loadLastProject(): ImportedDiagram | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const result = importDin(raw);
    return result.ok ? result.diagram : null;
  } catch {
    return null;
  }
}


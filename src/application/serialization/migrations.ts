import { DIN_CURRENT_VERSION } from './din.schema';
import type { ImportFailure } from './import-error';

export type DinMigration = (document: Record<string, unknown>) => Record<string, unknown>;

/**
 * `MIGRATIONS[n]` upgrades a version-`n` document to version `n + 1`.
 *
 * Empty today, wired up from day one: a diagram saved for a presentation must
 * keep opening after the format evolves.
 */
export const MIGRATIONS: Record<number, DinMigration> = {};

export type MigrationResult =
  | { ok: true; document: Record<string, unknown> }
  | { ok: false; error: ImportFailure };

export function migrateToCurrent(raw: unknown): MigrationResult {
  if (typeof raw !== 'object' || raw === null) {
    return { ok: false, error: { code: 'invalid' } };
  }

  let document = raw as Record<string, unknown>;
  const version = document.version;

  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    return { ok: false, error: { code: 'invalid' } };
  }

  if (version > DIN_CURRENT_VERSION) {
    return { ok: false, error: { code: 'newer-version' } };
  }

  for (let current = version; current < DIN_CURRENT_VERSION; current += 1) {
    const migration = MIGRATIONS[current];
    if (!migration) {
      return { ok: false, error: { code: 'no-migration', from: current, to: current + 1 } };
    }
    document = migration(document);
  }

  return { ok: true, document };
}

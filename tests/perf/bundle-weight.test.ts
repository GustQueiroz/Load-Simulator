import { access, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { PERF_BUDGETS } from './budgets';

async function collectJsBytes(dir: string): Promise<number> {
  let total = 0;
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      total += await collectJsBytes(full);
      continue;
    }
    if (!entry.name.endsWith('.js')) continue;
    total += (await stat(full)).size;
  }
  return total;
}

describe('static asset weight', () => {
  it('keeps production JS under the weight budget when out/ exists', async () => {
    const root = path.join(process.cwd(), 'out', '_next', 'static');
    try {
      await access(root);
    } catch {
      return;
    }

    const bytes = await collectJsBytes(root);
    const miB = bytes / (1024 * 1024);
    expect(miB).toBeLessThan(PERF_BUDGETS.staticJsMiB);
  });
});

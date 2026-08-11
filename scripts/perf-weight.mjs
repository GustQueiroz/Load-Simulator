#!/usr/bin/env node
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const STATIC = path.join(ROOT, 'out', '_next', 'static');
const MAX_MIB = 8;

async function collectJsBytes(dir) {
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

const bytes = await collectJsBytes(STATIC);
const miB = bytes / (1024 * 1024);
const report = { staticJsBytes: bytes, staticJsMiB: Number(miB.toFixed(3)), budgetMiB: MAX_MIB };
console.log(JSON.stringify(report, null, 2));

if (miB >= MAX_MIB) {
  console.error(`Bundle weight ${miB.toFixed(2)} MiB exceeds budget ${MAX_MIB} MiB`);
  process.exitCode = 1;
}

#!/usr/bin/env node
import { createServer } from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { chromium } from 'playwright';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'out');
const PORT = 3018;

const BUDGETS = {
  uiFpsMin: 45,
  uiFrameGapP95Ms: 40,
  uiPlayLatencyP95Ms: 250,
  heapGrowthMiBMax: 80,
};

async function main() {
  if (!existsSync(path.join(OUT, 'index.html'))) {
    throw new Error('Missing out/index.html — run `npm run build` first.');
  }

  const server = await listenStatic(OUT, PORT);
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-precise-memory-info'],
  });
  const page = await browser.newPage();

  try {
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle' });
    await page.keyboard.press('Escape');
    await page.keyboard.press('Escape');

    await page.getByRole('button', { name: /iniciar|start|play/i }).first().waitFor({
      state: 'visible',
      timeout: 15_000,
    });

    const heapBefore = await readHeap(page);

    const playLatencyMs = await page.evaluate(async () => {
      const button =
        document.querySelector('[data-lesson-anchor="toolbar-start"]') ??
        Array.from(document.querySelectorAll('button')).find((el) =>
          /iniciar|start|play/i.test(el.textContent ?? ''),
        );
      if (!(button instanceof HTMLElement)) throw new Error('Play control not found');

      const start = performance.now();
      button.click();
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      return performance.now() - start;
    });

    const sample = await page.evaluate(async () => {
      const gaps = [];
      let frames = 0;
      let last = performance.now();
      const started = last;

      await new Promise((resolve) => {
        const step = (now) => {
          gaps.push(now - last);
          last = now;
          frames += 1;
          if (now - started < 2000) requestAnimationFrame(step);
          else resolve(undefined);
        };
        requestAnimationFrame(step);
      });

      gaps.sort((a, b) => a - b);
      const p95 = gaps[Math.min(gaps.length - 1, Math.ceil(0.95 * gaps.length) - 1)] ?? 0;
      const elapsed = (performance.now() - started) / 1000;
      return { fps: frames / elapsed, frameGapP95Ms: p95, frames };
    });

    const heapAfter = await readHeap(page);
    const heapGrowthMiB =
      heapBefore != null && heapAfter != null ? (heapAfter - heapBefore) / (1024 * 1024) : null;

    const report = {
      playLatencyMs: Number(playLatencyMs.toFixed(2)),
      fps: Number(sample.fps.toFixed(1)),
      frameGapP95Ms: Number(sample.frameGapP95Ms.toFixed(2)),
      frames: sample.frames,
      heapBeforeBytes: heapBefore,
      heapAfterBytes: heapAfter,
      heapGrowthMiB: heapGrowthMiB != null ? Number(heapGrowthMiB.toFixed(2)) : null,
      budgets: BUDGETS,
    };

    console.log(JSON.stringify(report, null, 2));

    const failures = [];
    if (report.fps < BUDGETS.uiFpsMin) failures.push(`fps ${report.fps} < ${BUDGETS.uiFpsMin}`);
    if (report.frameGapP95Ms > BUDGETS.uiFrameGapP95Ms) {
      failures.push(`frameGapP95 ${report.frameGapP95Ms} > ${BUDGETS.uiFrameGapP95Ms}`);
    }
    if (report.playLatencyMs > BUDGETS.uiPlayLatencyP95Ms) {
      failures.push(`playLatency ${report.playLatencyMs} > ${BUDGETS.uiPlayLatencyP95Ms}`);
    }
    if (heapGrowthMiB != null && heapGrowthMiB > BUDGETS.heapGrowthMiBMax) {
      failures.push(`heapGrowth ${heapGrowthMiB.toFixed(1)}MiB > ${BUDGETS.heapGrowthMiBMax}`);
    }

    if (failures.length) {
      console.error('UI perf budgets failed:\n- ' + failures.join('\n- '));
      process.exitCode = 1;
    }
  } finally {
    await browser.close();
    await server.close();
  }
}

async function readHeap(page) {
  return page.evaluate(() => {
    const mem = performance.memory;
    return mem ? mem.usedJSHeapSize : null;
  });
}

function listenStatic(root, port) {
  const mime = new Map([
    ['.html', 'text/html; charset=utf-8'],
    ['.js', 'application/javascript; charset=utf-8'],
    ['.css', 'text/css; charset=utf-8'],
    ['.json', 'application/json'],
    ['.svg', 'image/svg+xml'],
    ['.png', 'image/png'],
    ['.ico', 'image/x-icon'],
    ['.txt', 'text/plain; charset=utf-8'],
    ['.woff2', 'font/woff2'],
  ]);

  const server = createServer((req, res) => {
    const urlPath = decodeURIComponent((req.url ?? '/').split('?')[0] || '/');
    let filePath = path.join(root, urlPath === '/' ? 'index.html' : urlPath);
    if (!filePath.startsWith(root)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (!existsSync(filePath) || statSync(filePath).isDirectory()) {
      filePath = path.join(root, 'index.html');
    }
    const type = mime.get(path.extname(filePath)) ?? 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    createReadStream(filePath)
      .on('error', () => {
        res.writeHead(404);
        res.end('missing');
      })
      .pipe(res);
  });

  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(port, '127.0.0.1', () => {
      resolve({
        close: () =>
          new Promise((res) => {
            server.close(() => res());
          }),
      });
    });
  });
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

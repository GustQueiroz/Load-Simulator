import { expect, type Locator, type Page } from '@playwright/test';

import { ptBR } from '@/i18n/messages/pt-BR';

/**
 * Shared vocabulary for the end-to-end suite.
 *
 * Selectors go through roles, the message catalog, and the `data-lesson-*`
 * anchors the app already uses — so a test breaks when behaviour changes
 * rather than when a class name does. Reading the catalog also means a copy
 * change never leaves a test asserting a string nobody ships anymore.
 */
export class App {
  constructor(readonly page: Page) {}

  /**
   * Opens the app as a returning visitor — the first-run tour already seen —
   * because that is the state almost every test is about. Pass
   * `firstRun: true` to get the tour.
   */
  static async open(page: Page, { path = '/', firstRun = false } = {}): Promise<App> {
    if (!firstRun) await seedReturningVisitor(page);
    const app = new App(page);
    await page.goto(path);
    await app.waitForCanvas();
    return app;
  }

  /** The canvas has hydrated and React Flow has measured the cards. */
  async waitForCanvas(): Promise<void> {
    await expect(this.nodes.first()).toBeVisible();
    await expect
      .poll(async () => (await this.nodes.first().boundingBox())?.width ?? 0)
      .toBeGreaterThan(0);
  }

  get nodes(): Locator {
    return this.page.locator('.react-flow__node');
  }

  node(id: string): Locator {
    return this.page.locator(`.react-flow__node[data-id="${id}"]`);
  }

  get edges(): Locator {
    return this.page.locator('.react-flow__edge');
  }

  get startButton(): Locator {
    return this.page.locator('[data-lesson-anchor="toolbar-start"]');
  }

  get systemPanel(): Locator {
    return this.page.locator('[data-lesson-anchor="system-panel"]');
  }

  get palette(): Locator {
    return this.page.locator('[data-lesson-keepout="palette"]');
  }

  get clock(): Locator {
    return this.page.getByLabel(ptBR['toolbar.elapsed']);
  }

  async toggleRun(): Promise<void> {
    await this.startButton.click();
  }

  /** Waits until the simulation has produced at least one frame of traffic. */
  async waitForTraffic(): Promise<void> {
    await expect(this.systemPanel).toContainText(ptBR['system.input'], { timeout: 15_000 });
  }

  async elapsedSeconds(): Promise<number> {
    const text = (await this.clock.innerText()).trim();
    const [minutes, seconds] = text.split(':');
    return Number(minutes ?? 0) * 60 + Number(seconds ?? 0);
  }

  async boxOf(locator: Locator): Promise<Box> {
    const box = await locator.boundingBox();
    if (!box) throw new Error('element is not visible, so it has no box');
    return box;
  }
}

/** Keys the app reads on boot. Seeded before any page script runs. */
const TOUR_SEEN_KEY = 'system-design-simulator:tour-seen';
const CHECKLIST_DISMISSED_KEY = 'system-design-simulator:checklist-dismissed';
const PROGRESS_KEY = 'system-design-simulator:lesson-progress';

/**
 * Marks lessons as already cleared, so a test can start a mission without
 * playing the ten lessons that unlock it.
 */
export async function seedProgress(page: Page, lessonIds: readonly string[]): Promise<void> {
  await page.addInitScript(
    ([key, ids]) => {
      const progress: Record<string, { stars: number; completedAt: string }> = {};
      for (const id of ids as string[]) {
        progress[id] = { stars: 3, completedAt: '2026-01-01T00:00:00.000Z' };
      }
      window.localStorage.setItem(key as string, JSON.stringify(progress));
    },
    [PROGRESS_KEY, lessonIds] as const,
  );
}

async function seedReturningVisitor(page: Page): Promise<void> {
  await page.addInitScript(
    ([tour, checklist]) => {
      window.localStorage.setItem(tour, '1');
      window.localStorage.setItem(checklist, '1');
    },
    [TOUR_SEEN_KEY, CHECKLIST_DISMISSED_KEY],
  );
}

export interface Box {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Two rectangles share pixels. `tolerance` forgives sub-pixel rounding. */
export function overlaps(a: Box, b: Box, tolerance = 1): boolean {
  return (
    a.x < b.x + b.width - tolerance &&
    b.x < a.x + a.width - tolerance &&
    a.y < b.y + b.height - tolerance &&
    b.y < a.y + a.height - tolerance
  );
}

import { expect, test } from '@playwright/test';

import { ptBR } from '@/i18n/messages/pt-BR';

import { App, overlaps } from './support/app';

/**
 * One test per defect fixed by hand. Each of these shipped once; without a
 * test they can ship again, and every one of them is invisible to a unit
 * suite because they are about layout and focus in a real browser.
 */

test('lesson cards never overlap each other', async ({ page }) => {
  const app = await App.open(page);

  await page.getByRole('button', { name: ptBR['toolbar.worldmap'], exact: true }).click();
  const map = page.getByRole('dialog', { name: ptBR['worldmap.title'] });
  await map
    .getByRole('button', { name: new RegExp(`${ptBR['worldmap.play']}|${ptBR['worldmap.replay']}`) })
    .first()
    .click();
  await expect(map).toBeHidden();

  // Cards grow when the metric block appears, so measure while running.
  await app.toggleRun();
  await app.waitForTraffic();
  await page.waitForTimeout(600);

  const boxes = await app.nodes.evaluateAll((elements) =>
    elements.map((element) => {
      const rect = element.getBoundingClientRect();
      return { id: element.getAttribute('data-id') ?? '', x: rect.x, y: rect.y, width: rect.width, height: rect.height };
    }),
  );

  const collisions: string[] = [];
  for (let i = 0; i < boxes.length; i += 1) {
    for (let j = i + 1; j < boxes.length; j += 1) {
      if (overlaps(boxes[i], boxes[j], 2)) collisions.push(`${boxes[i].id} × ${boxes[j].id}`);
    }
  }

  expect(collisions).toEqual([]);
});

test('the lesson balloon never covers the palette', async ({ page }) => {
  const app = await App.open(page);

  await page.getByRole('button', { name: ptBR['toolbar.worldmap'], exact: true }).click();
  const map = page.getByRole('dialog', { name: ptBR['worldmap.title'] });
  await map
    .getByRole('button', { name: new RegExp(`${ptBR['worldmap.play']}|${ptBR['worldmap.replay']}`) })
    .first()
    .click();
  await expect(map).toBeHidden();

  const balloon = page.getByText(ptBR['lesson.0.1.balloon.play.title']);
  await expect(balloon).toBeVisible();

  const palette = await app.boxOf(app.palette);
  const balloonBox = await app.boxOf(balloon.locator('..').locator('..'));

  expect(overlaps(palette, balloonBox, 2)).toBe(false);
});

test('a modal traps focus and gives it back on close', async ({ page }) => {
  await App.open(page);

  const opener = page.getByRole('button', { name: ptBR['toolbar.worldmap'], exact: true });
  await opener.click();

  const map = page.getByRole('dialog', { name: ptBR['worldmap.title'] });
  await expect(map).toBeVisible();

  // Focus starts inside, and Tab keeps it there.
  await expect.poll(() => map.evaluate((node) => node.contains(document.activeElement))).toBe(true);
  for (let i = 0; i < 25; i += 1) await page.keyboard.press('Tab');
  expect(await map.evaluate((node) => node.contains(document.activeElement))).toBe(true);

  await page.keyboard.press('Escape');
  await expect(map).toBeHidden();
  await expect(opener).toBeFocused();
});

test('opening a modal does not scroll the shell sideways', async ({ page }) => {
  await App.open(page);

  await page.getByRole('button', { name: ptBR['toolbar.worldmap'], exact: true }).click();
  await expect(page.getByRole('dialog', { name: ptBR['worldmap.title'] })).toBeVisible();

  const scroll = await page.evaluate(() => ({
    x: window.scrollX,
    body: document.body.scrollLeft,
  }));

  expect(scroll.x).toBe(0);
  expect(scroll.body).toBe(0);
});

test('the world map is inert to the canvas behind it', async ({ page }) => {
  const app = await App.open(page);

  await page.getByRole('button', { name: ptBR['toolbar.worldmap'], exact: true }).click();
  await expect(page.getByRole('dialog', { name: ptBR['worldmap.title'] })).toBeVisible();

  const canvasReachable = await app.nodes
    .first()
    .evaluate((node) => node.closest('[inert]') !== null || node.matches('[inert] *'));

  expect(canvasReachable).toBe(true);
});

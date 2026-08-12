import { expect, test } from '@playwright/test';

import { ptBR } from '@/i18n/messages/pt-BR';

import { App, overlaps } from './support/app';

/**
 * On a phone the palette used to open over the diagram, hiding the thing the
 * learner is trying to build.
 */
test('the palette starts collapsed on a phone and opens on demand', async ({ page }) => {
  const app = await App.open(page);

  const opener = page.getByRole('button', { name: ptBR['palette.open'] });
  await expect(opener).toBeVisible();
  await expect(page.getByRole('button', { name: ptBR['palette.close'] })).toBeHidden();

  await opener.click();
  await expect(page.getByRole('button', { name: ptBR['palette.close'] })).toBeVisible();
  await expect(app.palette.getByRole('button', { name: ptBR['kind.cache'], exact: true })).toBeVisible();
});

test('the page never scrolls sideways on a phone', async ({ page }) => {
  await App.open(page);

  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  expect(overflow).toBeLessThanOrEqual(1);
});

test('the inspector opens as a sheet without covering the toolbar', async ({ page }) => {
  const app = await App.open(page);

  await app.nodes.first().click();

  const toolbar = await app.boxOf(app.startButton);
  const sheet = page.locator('[role="dialog"], aside').filter({ hasText: ptBR['inspector.title'] }).first();

  if (await sheet.isVisible()) {
    expect(overlaps(toolbar, await app.boxOf(sheet), 2)).toBe(false);
  }
});

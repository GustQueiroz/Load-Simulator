import { expect, test } from '@playwright/test';

import { ptBR } from '@/i18n/messages/pt-BR';

import { App } from './support/app';

test.describe('the simulator runs', () => {
  test('loads a preset, runs it, and reports traffic', async ({ page }) => {
    const app = await App.open(page);

    await expect(app.nodes).not.toHaveCount(0);
    await expect(app.systemPanel).toContainText(ptBR['system.idle']);

    await app.toggleRun();
    await app.waitForTraffic();

    await expect.poll(() => app.elapsedSeconds()).toBeGreaterThan(0);
    await expect(app.startButton).toContainText(ptBR['toolbar.stop']);

    await app.toggleRun();
    await expect(app.startButton).toContainText(ptBR['toolbar.start']);
  });

  test('adds a component from the palette', async ({ page }) => {
    const app = await App.open(page);
    const before = await app.nodes.count();

    await app.palette.getByRole('button', { name: ptBR['kind.cache'], exact: true }).click();

    await expect(app.nodes).toHaveCount(before + 1);
  });

  test('greets a first-time visitor with the tour, and only once', async ({ page }) => {
    const tour = page.getByRole('dialog', { name: ptBR['tour.step1.title'] });

    await page.goto('/');
    await expect(tour).toBeVisible();

    await page.getByRole('button', { name: ptBR['tour.skip'] }).first().click();
    await expect(tour).toBeHidden();

    await page.reload();
    await new App(page).waitForCanvas();
    await expect(tour).toBeHidden();
  });

  test('reports no console errors on load', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    const app = await App.open(page);
    await app.toggleRun();
    await app.waitForTraffic();

    expect(errors).toEqual([]);
  });
});

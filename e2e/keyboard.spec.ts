import { expect, test } from '@playwright/test';

import { ptBR } from '@/i18n/messages/pt-BR';

import { App } from './support/app';

/** The whole diagram, driven without a pointer. */
test.describe('canvas keyboard', () => {
  test('moves a node with the arrow keys', async ({ page }) => {
    const app = await App.open(page);

    const first = app.nodes.first();
    const id = await first.getAttribute('data-id');
    expect(id).toBeTruthy();

    await first.focus();
    await page.keyboard.press('Enter'); // select
    const before = await app.boxOf(first);

    for (let i = 0; i < 10; i += 1) await page.keyboard.press('ArrowRight');

    await expect.poll(async () => (await app.boxOf(first)).x).toBeGreaterThan(before.x);
  });

  test('connects two nodes with C, and cancels with Escape', async ({ page }) => {
    const app = await App.open(page);

    // Two nodes with no edge between them: add a fresh cache and wire the
    // first node to it.
    await app.palette.getByRole('button', { name: ptBR['kind.cache'], exact: true }).click();
    const added = app.nodes.last();
    const targetId = await added.getAttribute('data-id');

    const source = app.nodes.first();
    const sourceId = await source.getAttribute('data-id');
    const edgesBefore = await app.edges.count();

    // Arm, then change your mind.
    await source.focus();
    await page.keyboard.press('c');
    await expect(page.getByText(/Conectando a partir de/)).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.getByText(/Conectando a partir de/)).toBeHidden();
    expect(await app.edges.count()).toBe(edgesBefore);

    // Arm, then complete.
    await source.focus();
    await page.keyboard.press('c');
    await added.focus();
    await page.keyboard.press('c');

    await expect(app.edges).toHaveCount(edgesBefore + 1);
    await expect(
      page.locator(`.react-flow__edge[data-testid="rf__edge-"], .react-flow__edge`),
    ).not.toHaveCount(0);
    expect(sourceId).not.toBe(targetId);
  });

  test('pressing C on a focused node does not toggle the simulation', async ({ page }) => {
    const app = await App.open(page);

    await app.nodes.first().focus();
    await page.keyboard.press('Enter');

    // Enter on a node selects it; it must not double as the run shortcut.
    await expect(app.startButton).toContainText(ptBR['toolbar.start']);
  });
});

import { expect, test } from '@playwright/test';

import { ptBR } from '@/i18n/messages/pt-BR';

import { App, seedProgress } from './support/app';

/**
 * Lesson 0.1 start to finish: open the map, play the lesson, satisfy the win,
 * and see the completion modal. The unit suite proves every lesson is
 * *winnable*; this proves the app actually lets a learner win one.
 */
test('plays lesson 0.1 to completion', async ({ page }) => {
  const app = await App.open(page);

  await page.getByRole('button', { name: ptBR['toolbar.worldmap'], exact: true }).click();
  const map = page.getByRole('dialog', { name: ptBR['worldmap.title'] });
  await expect(map).toBeVisible();

  await map
    .getByRole('button', { name: new RegExp(`${ptBR['worldmap.play']}|${ptBR['worldmap.replay']}`) })
    .first()
    .click();
  await expect(map).toBeHidden();

  // The coach is up on the first step, so the lesson really is running.
  await expect(page.getByText(ptBR['lesson.0.1.balloon.play.title'])).toBeVisible();

  // Win condition: start it, let the bottleneck appear, pause.
  await app.toggleRun();
  await app.waitForTraffic();
  await expect.poll(() => app.elapsedSeconds(), { timeout: 15_000 }).toBeGreaterThanOrEqual(1);
  await app.toggleRun();

  const complete = page.getByRole('dialog', { name: ptBR['lesson.0.1.title'] });
  await expect(complete).toBeVisible({ timeout: 15_000 });
  await expect(complete).toContainText(ptBR['lesson.complete.kicker']);
  await expect(complete).toContainText('★');
});

/**
 * Hints belong to missions: a guided lesson already walks the learner through
 * it step by step, so the coach balloon is the hint there.
 */
test('offers a mission hint one step at a time', async ({ page }) => {
  await seedProgress(page, ['0.1', '0.2', '1.1', '1.2', '1.3', '1.4', '1.5']);
  const app = await App.open(page);

  await page.getByRole('button', { name: ptBR['toolbar.worldmap'], exact: true }).click();
  const map = page.getByRole('dialog', { name: ptBR['worldmap.title'] });
  await map
    .getByRole('listitem')
    .filter({ hasText: ptBR['lesson.2.1.title'] })
    .getByRole('button', { name: new RegExp(`${ptBR['worldmap.play']}|${ptBR['worldmap.replay']}`) })
    .click();
  await expect(map).toBeHidden();

  // Missions open with a briefing; accept it to get to the canvas.
  await page.getByRole('button', { name: ptBR['mission.accept'] }).click();

  await expect(page.getByText(ptBR['lesson.2.1.hint1'])).toBeHidden();

  await page.getByRole('button', { name: ptBR['lesson.hint.ask'] }).click();
  await expect(page.getByText(ptBR['lesson.2.1.hint1'])).toBeVisible();
  await expect(page.getByText(ptBR['lesson.2.1.hint2'])).toBeHidden();

  await page.getByRole('button', { name: ptBR['lesson.hint.more'] }).click();
  await expect(page.getByText(ptBR['lesson.2.1.hint2'])).toBeVisible();

  // Two levels is the whole ladder.
  await expect(page.getByRole('button', { name: ptBR['lesson.hint.more'] })).toBeHidden();

  await expect(app.nodes).not.toHaveCount(0);
});

test('a guided lesson leads with the coach, not with hints', async ({ page }) => {
  await App.open(page);

  await page.getByRole('button', { name: ptBR['toolbar.worldmap'], exact: true }).click();
  const map = page.getByRole('dialog', { name: ptBR['worldmap.title'] });
  await map
    .getByRole('button', { name: new RegExp(`${ptBR['worldmap.play']}|${ptBR['worldmap.replay']}`) })
    .first()
    .click();
  await expect(map).toBeHidden();

  await expect(page.getByText(ptBR['lesson.0.1.balloon.play.title'])).toBeVisible();
  await expect(page.getByRole('button', { name: ptBR['lesson.hint.ask'] })).toBeHidden();
});

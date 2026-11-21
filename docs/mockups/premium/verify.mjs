import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const directory = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const report = { pages: [], errors: [], overflows: [], interactions: [] };
try {
  await fs.mkdir(path.join(directory, 'review'), { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto('http://127.0.0.1:4320');
  await page.waitForFunction(() => window.kochivoConcept?.ready);
  await page.evaluate(() => document.fonts.ready);
  const pages = await page.evaluate(() => window.kochivoConcept.pages);
  for (const entry of pages) {
    await page.evaluate(id => { window.kochivoConcept.state.appearance = 'dark'; window.kochivoConcept.navigate(id); }, entry.id);
    const text = await page.locator('#k-product').innerText();
    assert.ok(!text.includes('undefined'), `${entry.id} contains undefined copy`);
    assert.ok(text.length > 80, `${entry.id} has no useful page content`);
    await page.screenshot({ path: path.join(directory, `review/${entry.id}.png`), fullPage: true });
    report.pages.push({ id: entry.id, route: entry.route, group: entry.group });
  }
  for (const width of [1024, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    for (const appearance of ['dark', 'light']) {
      for (const entry of pages) {
        await page.evaluate(({ id, appearance }) => {
          window.kochivoConcept.state.appearance = appearance;
          window.kochivoConcept.navigate(id);
        }, { id: entry.id, appearance });
        const sizes = await page.evaluate(() => {
          const root = document.getElementById('kochivo-premium');
          return { root: root.clientWidth, content: root.scrollWidth, viewport: innerWidth, document: document.documentElement.scrollWidth };
        });
        if (sizes.content > sizes.root + 2 || sizes.document > sizes.viewport + 2) report.overflows.push({ id: entry.id, width, appearance, ...sizes });
      }
    }
  }
  assert.deepEqual(report.overflows, []);
  await page.setViewportSize({ width: 1024, height: 1100 });
  const nav = async id => page.evaluate(id => window.kochivoConcept.navigate(id), id);
  await nav('roster');
  await page.locator('#k-roster-search').fill('سارة');
  assert.equal(await page.locator('#k-roster-table tbody tr').count(), 1);
  await page.locator('#k-roster-search').fill('nobody');
  assert.ok(await page.locator('.k-empty').isVisible());
  report.interactions.push('roster search and empty state');
  await nav('player-home');
  await page.locator('[data-action="water"]').click();
  assert.equal(await page.evaluate(() => window.kochivoConcept.state.water), 1.75);
  await nav('workout');
  await page.locator('[data-stepper="weight-plus"]').click();
  assert.equal(await page.evaluate(() => window.kochivoConcept.state.weight), 62.5);
  await page.locator('[data-action="finish-set"]').click();
  assert.ok(await page.locator('.k-rest-time').isVisible());
  await page.locator('[data-action="skip-rest"]').click();
  assert.ok(await page.locator('[data-action="finish-set"]').isVisible());
  report.interactions.push('water, workout steppers, set completion and rest');
  await nav('nutrition');
  await page.locator('[data-meal="0"]').click();
  assert.equal(await page.locator('[data-meal="0"]').getAttribute('aria-pressed'), 'true');
  await page.locator('[data-action="swap"], [data-swap]').first().click();
  await page.locator('[data-swap-choice="1"]').click();
  assert.equal(await page.evaluate(() => window.kochivoConcept.state.swaps[window.kochivoConcept.state.swapMeal][0]), 'زبادي يوناني وشوفان');
  assert.equal(await page.locator('.k-meal h2').first().innerText(), 'زبادي يوناني وشوفان');
  report.interactions.push('meal log and food alternative');
  await nav('invite');
  await page.locator('form[data-form="invite"] button[type="submit"]').click();
  assert.ok(await page.getByLabel('كود التأكيد').isVisible());
  await page.getByLabel('كود التأكيد').fill('123456');
  await page.locator('form[data-form="invite"] button[type="submit"]').click();
  for (let i = 0; i < 4; i++) await page.locator('form[data-form="onboarding"] button[type="submit"]').click();
  assert.equal(await page.locator('#k-product').getAttribute('data-page'), 'player-home');
  report.interactions.push('invitation, code step and four-step onboarding');
  await nav('inbox');
  await page.locator('[data-form="reply"] textarea').fill('أداء كويس، كمّلي على نفس الخطة.');
  await page.locator('[data-form="reply"] button[type="submit"]').click();
  assert.equal(await page.evaluate(() => window.kochivoConcept.state.replied), true);
  report.interactions.push('review response stays local');
  await nav('program');
  const count = await page.locator('tbody tr').count();
  await page.locator('[data-action="exercise"]').click();
  await page.locator('[data-exercise="0"]').click();
  assert.equal(await page.locator('tbody tr').count(), count + 1);
  report.interactions.push('program builder adds an exercise');
  await page.evaluate(() => { window.kochivoConcept.state.appearance = 'dark'; });
  await nav('site');
  await page.screenshot({ path: path.join(directory, 'review/site-dark-desktop.png'), fullPage: true });
  await page.locator('#k-appearance').click();
  assert.equal(await page.locator('#kochivo-premium').getAttribute('data-appearance'), 'light');
  await page.screenshot({ path: path.join(directory, 'review/site-light-desktop.png'), fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await nav('coach-home');
  await page.locator('[data-action="coach-menu"]').click();
  await page.locator('#k-dialog [data-page="roster"]').click();
  assert.equal(await page.locator('#k-product').getAttribute('data-page'), 'roster');
  report.interactions.push('mobile captain menu');
  for (const id of ['site', 'coach-home', 'player-home', 'nutrition', 'workout']) {
    await nav(id);
    await page.screenshot({ path: path.join(directory, `review/${id}-mobile.png`), fullPage: true });
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  await browser.close();
  await fs.writeFile(path.join(directory, 'review/verification.json'), JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

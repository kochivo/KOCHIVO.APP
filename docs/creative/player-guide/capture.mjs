import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, '../../..');
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const report = { source: 'local-player-demo', captures: [], limitations: [] };
try {
  const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
  await page.goto('http://127.0.0.1:3000/demo', { waitUntil: 'networkidle', timeout: 90000 });
  const start = page.getByRole('button', { name: 'جرّب كلاعب', exact: true });
  await start.waitFor({ timeout: 30000 });
  if (await page.getByLabel('اتأكد إنك مش روبوت', { exact: true }).count() || !await start.isEnabled()) {
    throw new Error('Normal demo entry requires user verification; no bypass attempted');
  }
  await start.click();
  await page.waitForURL(/\/player\/?$/, { timeout: 60000 });
  await page.locator('main[data-tour-ready="true"]').waitFor({ timeout: 45000 });
  await fs.mkdir(path.join(directory, 'assets'), { recursive: true });
  for (const [id, route] of [
    ['home', '/player'], ['nutrition', '/player/nutrition'], ['progress', '/player/progress'],
    ['history', '/player/history'], ['captain', '/player/captain'], ['settings', '/player/settings'],
    ['rank', '/player/rank'],
  ]) {
    await page.goto(`http://127.0.0.1:3000${route}`, { waitUntil: 'networkidle', timeout: 60000 });
    await page.locator('main').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: path.join(directory, `assets/${id}.png`), fullPage: true });
    report.captures.push({ id, route });
  }
  await page.goto('http://127.0.0.1:3000/player', { waitUntil: 'networkidle' });
  const workout = page.getByRole('link', { name: 'ابدأ التمرين', exact: true });
  if (await workout.count()) {
    await workout.click();
    await page.waitForURL(/\/player\/workout\//);
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(directory, 'assets/workout.png'), fullPage: true });
    report.captures.push({ id: 'workout', route: '/player/workout/<demo-day>' });
  }
} catch (error) {
  report.limitations.push(error.message);
} finally {
  await browser.close();
  await fs.mkdir(path.join(directory, 'assets'), { recursive: true });
  for (const [id, file] of [
    ['home', '01-home'], ['nutrition', '02-nutrition'], ['progress', '03-progress'],
    ['history', '04-history'], ['captain', '05-captain'], ['settings', '06-settings'],
    ['workout', '07-workout'], ['swap', '10-food-swap'], ['rest', '11-rest-timer'],
  ]) {
    if (report.captures.some(item => item.id === id)) continue;
    await fs.copyFile(path.join(repository, `branding identity/02-screenshots/player/dark/mobile/${file}--full.png`),
      path.join(directory, `assets/${id}.png`));
    report.captures.push({ id, source: 'supplied-demo-capture-2026-11-06' });
  }
  await fs.mkdir(path.join(directory, 'review'), { recursive: true });
  await fs.writeFile(path.join(directory, 'review/capture.json'), JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

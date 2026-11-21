import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const directory = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ channel: 'msedge', headless: true });
const report = { scenes: [], errors: [] };
try {
  await fs.mkdir(path.join(directory, 'review'), { recursive: true });
  const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
  page.on('pageerror', error => report.errors.push(error.message));
  await page.goto('http://127.0.0.1:4319');
  await page.waitForFunction(() => window.guide?.ready, { timeout: 30000 });
  const scenes = await page.evaluate(() => window.guide.timeline.entries);
  report.duration = await page.evaluate(() => window.guide.timeline.duration);
  report.fonts = await page.evaluate(() => ({
    heading: document.fonts.check('700 67px Changa', 'دليل اللاعب'),
    body: document.fonts.check('500 44px Alexandria', 'رحلتك تبدأ هنا'),
  }));
  assert.ok(report.fonts.heading && report.fonts.body);
  for (const scene of scenes) {
    for (let i = 0; i < scene.captions.length; i++) {
      const result = await page.evaluate(time => window.guide.render(time), scene.start + (i + .5) * scene.seconds / scene.captions.length);
      assert.deepEqual(result.diagnostics, [], `Text overflows in ${scene.id}, caption ${i}`);
    }
    const frame = await page.evaluate(time => {
      window.guide.render(time);
      return document.querySelector('canvas').toDataURL('image/jpeg', .92).split(',')[1];
    }, scene.start + scene.seconds * .65);
    await fs.writeFile(path.join(directory, `review/${scene.id}.jpg`), Buffer.from(frame, 'base64'));
    report.scenes.push({ id: scene.id, title: scene.title, captions: scene.captions.length });
  }
  const storyboard = await page.evaluate(async scenes => {
    const canvas = document.createElement('canvas');
    canvas.width = 1620;
    canvas.height = Math.ceil(scenes.length / 6) * 480;
    const ctx = canvas.getContext('2d');
    for (let i = 0; i < scenes.length; i++) {
      window.guide.render(scenes[i].start + scenes[i].seconds * .65);
      ctx.drawImage(document.querySelector('canvas'), i % 6 * 270, Math.floor(i / 6) * 480, 270, 480);
    }
    return canvas.toDataURL('image/jpeg', .94).split(',')[1];
  }, scenes);
  await fs.writeFile(path.join(directory, 'review/storyboard.jpg'), Buffer.from(storyboard, 'base64'));
  await page.getByRole('button', { name: /06.*التغذية/ }).click();
  assert.equal(await page.locator('nav button[aria-current="true"]').count(), 1);
  const before = await page.evaluate(() => window.guide.time);
  await page.getByRole('button', { name: 'الخطوة الجاية', exact: true }).click();
  assert.ok(await page.evaluate(() => window.guide.time) > before);
  await page.getByRole('button', { name: 'الخطوة اللي فاتت', exact: true }).click();
  assert.equal(await page.evaluate(() => window.guide.time), before);
  await page.getByRole('button', { name: 'شغّل الدليل', exact: true }).click();
  await page.waitForFunction(before => window.guide.time > before + .1, before);
  await page.getByRole('button', { name: 'وقّف مؤقتًا', exact: true }).click();
  assert.equal(await page.evaluate(() => window.guide.playing), false);
  await page.evaluate(() => window.guide.seek(window.guide.timeline.duration));
  await page.getByRole('button', { name: 'شغّل من الأول', exact: true }).click();
  await page.waitForFunction(() => window.guide.time < 1 && window.guide.playing);
  await page.getByRole('button', { name: 'وقّف مؤقتًا', exact: true }).click();
  await page.evaluate(() => window.guide.seek(1));
  await page.screenshot({ path: path.join(directory, 'review/desktop.png') });
  await page.setViewportSize({ width: 390, height: 844 });
  report.mobileFits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  assert.ok(report.mobileFits);
  await page.screenshot({ path: path.join(directory, 'review/mobile.png'), fullPage: true });
  report.controls = await page.locator('button').evaluateAll(buttons => buttons.every(button => button.getBoundingClientRect().height >= 48));
  assert.ok(report.controls);
  report.silent = await page.locator('audio, video').count() === 0;
  assert.ok(report.silent);
  assert.deepEqual(report.errors, []);
  report.passed = true;
} finally {
  await browser.close();
  await fs.writeFile(path.join(directory, 'review/verification.json'), JSON.stringify(report, null, 2));
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
}

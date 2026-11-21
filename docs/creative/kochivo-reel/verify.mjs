import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const directory = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({ executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', headless: true });
const report = {};
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4318');
  await page.waitForFunction(() => window.reel?.ready);
  report.fonts = await page.evaluate(() => ({
    arabicHeadings: document.fonts.check('700 100px Changa', 'كوتشيفو'),
    arabicBody: document.fonts.check('500 40px Alexandria', 'خطوتك الجاية'),
  }));
  assert.ok(report.fonts.arabicHeadings && report.fonts.arabicBody);
  await page.getByRole('button', { name: 'التغذية', exact: true }).click();
  assert.equal(await page.locator('nav button[aria-current="true"]').textContent(), 'التغذية');
  await page.setViewportSize({ width: 390, height: 844 });
  report.mobileFits = await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);
  assert.ok(report.mobileFits);
  await page.screenshot({ path: path.join(directory, 'review/preview-mobile.png'), fullPage: true });
  report.media = await page.evaluate(async () => {
    const video = document.createElement('video');
    video.muted = true;
    video.src = './kochivo-day.mp4';
    await new Promise((resolve, reject) => { video.onloadedmetadata = resolve; video.onerror = () => reject(new Error(video.error.message)); });
    const details = { duration: video.duration, width: video.videoWidth, height: video.videoHeight };
    const canvas = document.createElement('canvas');
    canvas.width = 1440;
    canvas.height = 1280;
    const ctx = canvas.getContext('2d');
    const times = [1.6, 5.3, 9.2, 13.3, 18, 22.2, 25.8, 29.2];
    const reference = document.createElement('canvas');
    reference.width = 360;
    reference.height = 640;
    const referenceContext = reference.getContext('2d');
    details.sceneErrors = [];
    for (let i = 0; i < times.length; i++) {
      video.currentTime = times[i];
      await new Promise(resolve => { video.onseeked = resolve; });
      ctx.drawImage(video, i % 4 * 360, Math.floor(i / 4) * 640, 360, 640);
      window.reel.render(times[i]);
      referenceContext.drawImage(document.querySelector('canvas'), 0, 0, 360, 640);
      const expected = referenceContext.getImageData(0, 0, 360, 640).data;
      const actual = ctx.getImageData(i % 4 * 360, Math.floor(i / 4) * 640, 360, 640).data;
      let error = 0;
      for (let p = 0; p < actual.length; p += 4) {
        error += Math.abs(actual[p] - expected[p]) + Math.abs(actual[p + 1] - expected[p + 1]) + Math.abs(actual[p + 2] - expected[p + 2]);
      }
      details.sceneErrors.push(error / (360 * 640 * 3));
    }
    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let visible = 0;
    for (let i = 0; i < pixels.length; i += 4) if (pixels[i] > 60 || pixels[i + 1] > 60 || pixels[i + 2] > 60) visible++;
    details.visiblePixelRatio = visible / (canvas.width * canvas.height);
    details.storyboard = canvas.toDataURL('image/jpeg', 0.94).split(',')[1];
    const audio = new AudioContext();
    const bytes = await (await fetch('./kochivo-day.mp4')).arrayBuffer();
    const buffer = await audio.decodeAudioData(bytes);
    const samples = buffer.getChannelData(0);
    let sum = 0;
    let peak = 0;
    for (const sample of samples) { sum += sample * sample; peak = Math.max(peak, Math.abs(sample)); }
    details.audio = { duration: buffer.duration, sampleRate: buffer.sampleRate, rms: Math.sqrt(sum / samples.length), peak };
    await audio.close();
    return details;
  });
  const storyboard = report.media.storyboard;
  delete report.media.storyboard;
  await fs.writeFile(path.join(directory, 'review/export-storyboard.jpg'), Buffer.from(storyboard, 'base64'));
  assert.equal(report.media.width, 1080);
  assert.equal(report.media.height, 1920);
  assert.ok(Math.abs(report.media.duration - 31.2) < 0.6);
  assert.ok(report.media.sceneErrors.every(error => error < 10));
  assert.ok(report.media.visiblePixelRatio > 0.02);
  assert.ok(report.media.audio.rms > 0.005);
  assert.ok(report.media.audio.peak < 1);
  assert.ok(Math.abs(report.media.audio.duration - report.media.duration) < 0.6);
  assert.deepEqual(errors, []);
  report.errors = errors;
  report.result = 'PASS';
  await fs.writeFile(path.join(directory, 'review/verification.json'), JSON.stringify(report, null, 2) + '\n');
  process.stdout.write(JSON.stringify(report, null, 2) + '\n');
} finally {
  await browser.close();
}

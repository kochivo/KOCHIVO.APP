import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { decodeDataUrl } from './data-url.mjs';

const directory = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch({
  executablePath: 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  headless: true,
  args: ['--autoplay-policy=no-user-gesture-required', '--disable-background-timer-throttling', '--disable-renderer-backgrounding'],
});
try {
  const page = await browser.newPage({ viewport: { width: 1500, height: 1100 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4318');
  await page.waitForFunction(() => window.reel?.ready);
  await fs.mkdir(path.join(directory, 'review'), { recursive: true });
  const times = [1.6, 5.3, 9.2, 13.3, 18, 22.2, 25.8, 29.2];
  for (let i = 0; i < times.length; i++) {
    const data = await page.evaluate(t => {
      window.reel.render(t);
      return document.querySelector('canvas').toDataURL('image/jpeg', 0.92).split(',')[1];
    }, times[i]);
    await fs.writeFile(path.join(directory, 'review', `${String(i + 1).padStart(2, '0')}.jpg`), Buffer.from(data, 'base64'));
  }
  await page.screenshot({ path: path.join(directory, 'review', 'preview-desktop.png') });
  if (errors.length) throw new Error(errors.join('\n'));
  if (!process.argv.includes('--stills-only')) {
    process.stdout.write('Recording 31.2 seconds at 1080x1920 with original audio…\n');
    const result = await page.evaluate(() => window.reel.record());
    const bytes = decodeDataUrl(result.dataUrl);
    if (bytes.length !== result.size) throw new Error('Export byte count does not match the recorded media');
    await fs.writeFile(path.join(directory, 'kochivo-day.mp4'), bytes);
    process.stdout.write(`Saved kochivo-day.mp4: ${result.mimeType}, ${result.size} bytes\n`);
  }
} finally {
  await browser.close();
}

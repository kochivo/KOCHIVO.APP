import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import * as lucide from 'lucide-react';
import { chromium } from '@playwright/test';

const directory = path.dirname(fileURLToPath(import.meta.url));
const repository = path.resolve(directory, '../../..');
const read = file => fs.readFile(path.join(directory, file), 'utf8');
const source = await fs.readFile(path.join(repository, 'src/app/globals.css'), 'utf8');
const light = source.match(/html\[data-theme='light'\]\s*\{([\s\S]*?)\n\}/)?.[1];
if (!light) throw new Error('Light appearance tokens were not found');
function token(name, mode = source) {
  const match = mode.match(new RegExp(`--color-${name}:\\s*([^;]+);`));
  if (!match) throw new Error(`Missing existing token ${name}`);
  return match[1].trim();
}
const tokens = {};
for (const [key, name] of Object.entries({ BG: 'bg', SURFACE: 'surface', INK: 'ink', MUTED: 'muted', LINE: 'line' })) {
  tokens[`__DARK_${key}__`] = token(name);
  tokens[`__LIGHT_${key}__`] = token(name, light);
}
tokens.__DARK_RAISED__ = token('surface-raised');
tokens.__LIME__ = token('lime');
tokens.__LIME_INK__ = token('lime-ink', light);
tokens.__ON_LIME__ = token('on-lime');
const dataUrl = async (file, mime) => `data:${mime};base64,${(await fs.readFile(file)).toString('base64')}`;
const browser = await chromium.launch({ channel: 'msedge', headless: true });
try {
  const page = await browser.newPage();
  const original = await dataUrl(path.join(directory, 'assets/editorial-strength.png'), 'image/png');
  const jpeg = await page.evaluate(async url => {
    const image = new Image(); image.src = url; await image.decode();
    const canvas = document.createElement('canvas'); canvas.width = 1200; canvas.height = 800;
    canvas.getContext('2d').drawImage(image, 0, 0, 1200, 800);
    return canvas.toDataURL('image/jpeg', .82);
  }, original);
  await fs.writeFile(path.join(directory, 'assets/editorial-strength.jpg'), Buffer.from(jpeg.split(',')[1], 'base64'));
  tokens.__HERO__ = jpeg;
} finally { await browser.close(); }
tokens.__LOGO_DARK__ = await dataUrl(path.join(repository, 'public/brand/logo-primary.png'), 'image/png');
tokens.__LOGO_LIGHT__ = await dataUrl(path.join(repository, 'public/brand/logo-primary-light.png'), 'image/png');
let fontCss = '';
for (const [family, file, range] of [
  ['Manrope', '82450a180bcad83c-s.p.0p-wng2nn8o-p.woff2', 'U+0000-05FF,U+2000-206F'],
  ['Alexandria', 'ae8a6189deba2b59-s.p.29a202atpp3ye.woff2', 'U+0600-06FF,U+0750-077F,U+0870-08FF,U+200C-200E,U+FB50-FDFF,U+FE70-FEFC'],
]) {
  const url = await dataUrl(path.join(repository, 'branding identity/01-brand-assets/fonts/app-webfonts', file), 'font/woff2');
  fontCss += `@font-face{font-family:${family};font-style:normal;font-weight:100 900;font-display:swap;src:url('${url}') format('woff2');unicode-range:${range}}\n`;
}
const styleFiles = ['styles.css', 'public.css', 'auth.css', 'captain.css', 'player.css', 'responsive.css'];
const modules = ['messages.ts', 'model.mjs', 'ui.mjs', 'public.mjs', 'auth.mjs', 'captain.mjs', 'player.mjs', 'system.mjs', 'app.mjs'];
let code = (await Promise.all(modules.map(read))).map((text, i) => text.replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '') + `\n//# sourceURL=kochivo-premium-${modules[i]}\n`).join('\n');
// Each renderer imports the same copy dictionary; retain a single binding in the combined fragment.
code = code.replace('const messages =', 'const m =');
let fragment = `<style>${fontCss}${(await Promise.all(styleFiles.map(read))).join('\n')}</style>\n${await read('frame.html')}\n<script>\n(() => {\n${code}\n})();\n</script>\n`;
for (const [placeholder, value] of Object.entries(tokens)) fragment = fragment.replaceAll(placeholder, value);
if (/__(?:DARK|LIGHT|LIME|ON_LIME|LOGO|HERO)[A-Z_]*__/.test(fragment)) throw new Error('Unresolved asset or token');
if (Buffer.byteLength(fragment) >= 1000000) throw new Error('Inline design preview exceeds 1 MB');
await fs.writeFile(path.join(directory, 'kochivo-premium.html'), fragment);
const iconNames = ['arrow-up-left', 'arrow-right', 'plus', 'minus', 'x', 'search', 'check', 'check-check', 'house', 'users-round', 'inbox', 'layers-2',
  'trophy', 'credit-card', 'settings-2', 'layout-dashboard', 'dumbbell', 'utensils', 'calendar-days', 'bell', 'sun', 'moon',
  'grip-vertical', 'play', 'mic', 'crown', 'award', 'message-circle', 'trending-up', 'repeat-2', 'video', 'wifi-off', 'shield-alert', 'clock-3', 'menu'];
const icons = Object.fromEntries(iconNames.map(name => {
  const component = lucide[name.replace(/(^|-)([a-z0-9])/g, (_, separator, char) => char.toUpperCase())];
  if (!component) throw new Error(`Unknown Lucide icon ${name}`);
  return [name, renderToStaticMarkup(createElement(component, { width: 18, height: 18, strokeWidth: 1.5, 'aria-hidden': true }))];
}));
const fallback = `<script>window.lucide={createIcons(){const icons=${JSON.stringify(icons)};document.querySelectorAll('[data-lucide]').forEach(node=>{const html=icons[node.dataset.lucide];if(html)node.outerHTML=html;});}};</script>`;
const shell = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>KOCHIVO</title><style>body{margin:0;padding:20px;background:${token('bg')};}main{max-width:1200px;margin-inline:auto;}@media(max-width:600px){body{padding:8px;}}</style></head><body>${fallback}<main>${fragment}</main></body></html>`;
await fs.writeFile(path.join(directory, 'index.html'), shell);
process.stdout.write(`Built inline and browser previews: ${Buffer.byteLength(fragment)} bytes\n`);

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { expect, it } from 'vitest';

function files(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? files(join(dir, entry.name)) : [join(dir, entry.name)]);
}
const surfaces = readFileSync('src/app/surfaces.css', 'utf8');

it('keyframes animate only transform and opacity across CSS and TSX', () => {
  for (const file of files('src').filter(file => /\.(css|tsx)$/.test(file))) {
    const source = readFileSync(file, 'utf8');
    for (const keyframe of source.matchAll(/@keyframes\s+[\w-]+\s*\{((?:[^{}]|\{[^{}]*\})*)\}/g)) {
      const properties = [...(keyframe[1] ?? '').matchAll(/([\w-]+)\s*:/g)].map(match => match[1]);
      expect(properties.filter(property => !['transform', 'opacity'].includes(property ?? '')), file).toEqual([]);
    }
  }
});

it('uses no live blur on touch cards and caps overlay blur at 12px', () => {
  const touch = surfaces.split('@media (hover: none) and (pointer: coarse)')[1] ?? '';
  expect(touch).toContain('--glass-touch-filter: none');
  expect(touch).toContain('--glass-touch-filter: blur(12px)');
  expect(touch).toContain('linear-gradient(160deg, rgb(255 255 255/.075), rgb(255 255 255/.025) 45%, rgb(255 255 255/.04))');
  expect([...touch.matchAll(/blur\((\d+)px\)/g)].every(match => Number(match[1]) <= 12)).toBe(true);
});

it('defaults loops to paused and promotes layers only while running', () => {
  expect(surfaces).toContain('animation-play-state: paused');
  expect(surfaces).toContain("[data-motion-running='true']");
  expect(surfaces).toContain('animation-play-state: running');
});

it('connects every TSX loop to the shared visibility lifecycle', () => {
  for (const file of files('src').filter(file => file.endsWith('.tsx'))) {
    const source = readFileSync(file, 'utf8');
    if (/infinite|className="rank-shine"/.test(source)) {
      expect(source, file).toContain('useInView');
      expect(source, file).toContain('ref={motionRef}');
    }
  }
  expect(readFileSync('src/features/marketing/components/landing-motion.tsx', 'utf8')).toContain('observeInView');
});

it('requires an explicit visibility gate for every CSS loop', () => {
  const gated = new Map([['marketing-float', '.marketing-phone'], ['rank-shine', '.rank-shine'],
    ['skeleton-sweep', '.shimmer::after']]);
  for (const file of files('src').filter(file => file.endsWith('.css'))) {
    const source = readFileSync(file, 'utf8');
    for (const animation of source.matchAll(/animation:\s*([\w-]+)[^;{}]*\binfinite\b/g)) {
      const selector = gated.get(animation[1] ?? '');
      expect(selector, `${file}: ${animation[1]}`).toBeDefined();
      expect(surfaces).toContain(selector);
    }
  }
  const hook = readFileSync('src/lib/use-in-view.ts', 'utf8');
  for (const loop of ['animate-pulse', 'animate-spin', 'animate-bounce']) {
    expect(hook).toContain(loop);
    expect(surfaces).toContain(loop);
  }
});

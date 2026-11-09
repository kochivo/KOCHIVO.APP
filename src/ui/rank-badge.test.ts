import { readFileSync } from 'node:fs';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { RankBadge, type RankTier } from './rank-badge';
import { messages } from './messages';

const read = (path: string) => readFileSync(path, 'utf8');
const reference = read('docs/mockups/rank-badges.svg');
const tiers: RankTier[] = ['beginner', 'champion', 'elite', 'legend', 'crown'];
const render = (tier: RankTier, label = 'Rank', locked = false) =>
  renderToStaticMarkup(createElement(RankBadge, { tier, label, locked }));

describe('RankBadge', () => {
  it.each(tiers)('preserves every approved geometry element for %s', (tier) => {
    const group = reference.split(/<g transform="translate\(\d+ 5\)">/)[tiers.indexOf(tier) + 1];
    if (!group) throw new Error(`Missing reference geometry for ${tier}`);
    const markup = render(tier);
    for (const shape of group.matchAll(/<(path|circle|ellipse|rect)\b([^>]+)\/>/g)) {
      const geometry = [...(shape[2] ?? '').matchAll(/\s(d|cx|cy|r|rx|ry|x|y|width|height|transform)="([^"]+)"/g)];
      expect(markup).toContain(`<${shape[1]} ${geometry.map((attr) => `${attr[1]}="${attr[2]}"`).join(' ')}`);
    }
  });

  it('gives every gradient and clip a distinct ID on the same page', () => {
    const markup = renderToStaticMarkup(createElement('div', null,
      createElement(RankBadge, { tier: 'crown', label: '' }),
      createElement(RankBadge, { tier: 'crown', label: '' })));
    const ids = [...markup.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
    expect(ids.length).toBeGreaterThan(4);
    expect(new Set(ids).size).toBe(ids.length);
    for (const ref of markup.matchAll(/url\(#([^)]+)\)/g)) expect(ids).toContain(ref[1]);
  });

  it('labels images and hides decorative badges', () => {
    expect(render('elite', 'رتبة نخبة')).toContain('role="img" aria-label="رتبة نخبة"');
    expect(render('elite', '')).toContain('aria-hidden="true"');
    expect(render('elite', '')).not.toContain('aria-label=');
    expect(render('elite', 'Rank', true)).toContain('grayscale opacity-30');
  });

  it.each([['sm', 40], ['md', 64], ['lg', 96], ['xl', 140]] as const)('sizes %s at %s pixels', (size, width) => {
    const markup = renderToStaticMarkup(createElement(RankBadge, { tier: 'beginner', size, label: '' }));
    expect(markup).toContain(`width="${width}"`);
    expect(markup).toContain('viewBox="0 0 120 130"');
  });

  it('uses tokens and CSS motion with a reduced-motion override', () => {
    for (const file of ['rank-badge.tsx', 'rank-badge-shapes.tsx']) {
      expect(read(`src/ui/${file}`)).not.toMatch(/#[\da-f]{3,8}\b/i);
    }
    const css = read('src/app/globals.css');
    expect(css).toMatch(/@keyframes rank-shine/);
    expect(css).toMatch(/@media \(prefers-reduced-motion: reduce\)\s*\{\s*\.rank-shine\s*\{[^}]*animation: none/);
    expect(render('crown')).not.toContain('<animate');
    for (const color of reference.matchAll(/stop-color="(#[\da-f]+)"/gi)) expect(css).toContain(color[1]);
  });

  it('clips the sweep and gives the crown a faster cycle', () => {
    for (const tier of tiers) {
      const markup = render(tier);
      expect(markup).toMatch(/<g clip-path="url\(#[^)]+-clip\)"><rect[^>]+class="rank-shine"/);
      expect(markup).toContain(`animation-duration:${tier === 'crown' ? 3 : 4}s`);
      const body = markup.split('</defs>')[1] ?? '';
      expect(body.includes('var(--color-crown-gem-2)')).toBe(tier === 'crown');
    }
  });

  it('provides Arabic and English tier names', () => {
    expect(tiers.map((tier) => messages.ar[tier])).toEqual(['مبتدئ', 'بطل', 'نخبة', 'أسطورة', 'التاج']);
    expect(tiers.map((tier) => messages.en[tier])).toEqual(['Beginner', 'Champion', 'Elite', 'Legend', 'Crown']);
  });
});

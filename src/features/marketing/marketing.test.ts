import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { getContent } from './content';

const locale = vi.hoisted(() => ({ value: 'ar' }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: locale.value }) }) }));
import { Hero } from './components/hero';
import { Pricing } from './components/pricing';
import { Faq } from './components/faq';
import { FeaturesGrid } from './components/features-grid';
import { SiteFooter } from './components/site-footer';
import { HowItWorks } from './components/how-it-works';
import { WhyKochivo } from './components/why-kochivo';
import { FinalCta } from './components/final-cta';
import { SetPreview } from './components/set-preview';

describe('T-284 landing', () => {
  it.each(['ar', 'en'] as const)('keeps round-two arrows and numeric text in the inherited %s direction', async language => {
    locale.value = language;
    try {
      const hero = renderToStaticMarkup(await Hero());
      const features = renderToStaticMarkup(await FeaturesGrid());
      const compact = renderToStaticMarkup(await SetPreview({ compact: true }));
      const arrow = language === 'ar' ? '←' : '→';
      expect(hero).toMatch(/id="inside"[^>]*>\s*<div/);
      const signup = hero.match(/href="\/login\?tab=signup"[^>]*>(.*?)<\/a>/s)?.[1] ?? '';
      expect(signup).toContain(`aria-hidden="true">${arrow}</span>`);
      expect(signup).not.toContain('<svg');
      expect(hero.match(/<a[^>]*href="\/demo"[^>]*>/)?.[0]).toContain('font-extrabold');
      expect(features).toContain(`aria-hidden="true">${arrow}</span>`);
      for (const html of [hero, features]) {
        expect(html).toContain('<b>60 × 10</b>');
        expect(html).toContain('<b>62.5 × 8</b>');
        expect(html).not.toMatch(/<bdi[^>]*>(?:60 × 10|62\.5 × 8|3 \/ 13)<\/bdi>/);
      }
      expect(features).toMatch(/<span[^>]*>3 \/ 13<\/span>/);
      expect(compact).not.toMatch(/dir="ltr"|<bdi/);
      expect(compact).toContain('compactSet');
    } finally { locale.value = 'ar'; }
  });
  it('pins round-two typography and state colors without changing the heading wrap', () => {
    const css = readFileSync('src/features/marketing/components/landing.module.css', 'utf8');
    const preview = readFileSync('src/features/marketing/components/preview.module.css', 'utf8');
    expect(css).not.toContain('.stage > .slash');
    expect(css.match(/\.section h2\s*\{([^}]+)\}/)?.[1]).toContain('max-inline-size: 16ch');
    expect(css.match(/\.section h2\s*\{([^}]+)\}/)?.[1]).not.toContain('white-space: nowrap');
    expect(css.match(/\.comparison h3\s*\{([^}]+)\}/)?.[1]).toContain('font: 700 1.125rem');
    expect(css).toContain('.comparison article:first-child { color: var(--color-muted); }');
    expect(css).toContain('.legend span::before');
    expect(css).toContain('.moneyRows > div:first-child > b { color: var(--color-danger); }');
    expect(css).toContain('.renewChip');
    for (const selector of ['.money strong small', '.price small']) {
      const block = css.split(`${selector} {`)[1]?.split('}')[0];
      expect(block).toContain('.938rem');
      expect(block).toContain('var(--font-alexandria)');
    }
    expect(preview).toMatch(/\.compactSet \[data-preview-done\]\s*\{[^}]*font: 800 1rem/);
    expect(preview).toMatch(/\.compactSet \.record\s*\{[^}]*font-size: \.75rem[^}]*color: var\(--color-lime-ink\)/);
  });
  it('renders the v10 product sections and animated final slogan', async () => {
    const html = (await Promise.all([Hero(), FeaturesGrid(), FinalCta()])).map(part => renderToStaticMarkup(part)).join('');
    for (const id of ['hero', 'inside', 'player', 'demo-sec', 'final-slogan']) expect(html).toContain(`id="${id}"`);
    expect(html).toContain('data-workspace');
    expect(html).toContain('data-player-preview');
  });
  it('covers both slogans in reduced motion without one-off text sizes', () => {
    const root = 'src/features/marketing/components';
    const css = readFileSync(`${root}/landing.module.css`, 'utf8');
    const reduced = css.split('@media (prefers-reduced-motion: reduce)')[1] ?? '';
    expect(reduced).toContain('animation: none');
    expect(reduced).toContain('.hero');
    expect(reduced).toContain('.slogan');
    expect(reduced).toContain('.final');
    for (const name of ['hero', 'slogan', 'features-grid', 'pricing', 'faq', 'final-cta', 'site-header', 'site-footer', 'player-preview', 'workspace-preview', 'player-section', 'demo-section', 'set-preview', 'why-kochivo', 'how-it-works']) {
      expect(readFileSync(`${root}/${name}.tsx`, 'utf8')).not.toMatch(/text-\[\d+(?:\.\d+)?px\]/);
    }
  });
  it.each(['ar', 'en'] as const)('renders the approved content in %s', async language => {
    locale.value = language;
    const copy = getContent(createT(messages, language));
    const parts = await Promise.all([Hero(), Pricing(), Faq(), FeaturesGrid(), SiteFooter(), HowItWorks(), WhyKochivo(), FinalCta()]);
    const html = parts.map(part => renderToStaticMarkup(part)).join('');
    const hero = renderToStaticMarkup(parts[0]);
    expect(hero).toMatch(/<a\b[^>]*\bhref="\/demo"[^>]*>/);
    expect(hero).toContain(copy.hero.tryDemo);
    expect(hero).toContain('id="inside"');
    expect(html).toContain('YOUR NEXT MOVE STARTS HERE.');
    const heading = html.match(/<h1\b[^>]*>(.*?)<\/h1>/s)?.[1]?.replaceAll(/<[^>]*>/g, '').replaceAll(/\s+/g, ' ').trim();
    expect(heading).toBe('YOUR NEXT MOVE STARTS HERE.');
    expect(html).not.toMatch(/white-label/i);
    expect(copy.faq).toHaveLength(5);
    expect(copy.features).toHaveLength(8);
    expect(copy.features.filter(feature => feature.soon)).toHaveLength(2);
    expect(html).toContain('id="demo-sec"');
    expect(html).toContain('© Gym visual');
    expect(html.match(/© Gym visual/g)).toHaveLength(1);
    expect(renderToStaticMarkup(parts[4])).toContain('© Gym visual');
    expect(copy.plans.map(plan => [plan.price, plan.limit])).toEqual([[0, 5], [399, 20], [699, 40], [1499, 100]]);
    const pricing = renderToStaticMarkup(parts[1]);
    const cards = [...pricing.matchAll(/<article\b[^>]*>(.*?)<\/article>/gs)];
    expect(cards).toHaveLength(4);
    cards.forEach((card, index) => {
      for (const feature of copy.plans[index]?.checklist ?? []) expect(card[1]).toContain(feature);
      expect(card[1]).toContain(copy.plans[index]?.displayPrice);
      expect(card[1]).toContain(copy.plans[index]?.limitLabel);
    });
    expect(pricing).toMatch(/LEGEND<\/h3><span[^>]*>.*?<\/span><\/div>/);
    locale.value = 'ar';
  });
  it('gives every plan an independent inclusion list', () => {
    const copy = getContent(createT(messages, 'ar'));
    expect(copy.plans[0]?.checklist).not.toBe(copy.plans[1]?.checklist);
  });
  it('keeps approved copy and preserves the English slogan across locales', () => {
    vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
    try {
      for (const dictionary of [messages.ar, messages.arStd, messages.en]) {
        expect(dictionary?.sloganLabel).toBe('YOUR NEXT MOVE STARTS HERE.');
      }
      const standard = getContent(createT(messages, 'ar', 'standard'));
      expect(standard.features.filter(feature => feature.soon)).toHaveLength(2);
      expect(standard.faq).toHaveLength(5);
      expect(standard.hero.description).toContain('يسجّل');
      expect(messages.ar.kicker).toBe('للكباتن اللي بيدرّبوا أونلاين');
      expect(messages.ar.landingDescription).toBe('برامج التمرين والأكل والمتابعة والاشتراكات لكل لاعيبتك في مكان واحد. واللاعب بيسجّل تمرينه بإيد واحدة وهو في الجيم.');
    } finally { vi.unstubAllEnvs(); }
  });
  it('mounts only the approved sections and drops the white-label strip', () => {
    const route = readFileSync('src/app/[locale]/page.tsx', 'utf8');
    expect(route).not.toMatch(/WhiteLabel|PlayerSection|StatsStrip/);
    expect(route.indexOf('<WhyKochivo')).toBeLessThan(route.indexOf('<HowItWorks'));
    expect(route.indexOf('<FeaturesGrid')).toBeLessThan(route.indexOf('<HowItWorks'));
  });
});

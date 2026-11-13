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

describe('T-218 landing', () => {
  it.each(['ar', 'en'] as const)('renders the approved content in %s', async language => {
    locale.value = language;
    const copy = getContent(createT(messages, language));
    const parts = await Promise.all([Hero(), Pricing(), Faq(), FeaturesGrid(), SiteFooter(), HowItWorks(), WhyKochivo(), FinalCta()]);
    const html = parts.map(part => renderToStaticMarkup(part)).join('');
    const hero = renderToStaticMarkup(parts[0]);
    expect(hero).toMatch(/<a\b[^>]*\bhref="\/demo"[^>]*>/);
    expect(hero).toContain(copy.hero.tryDemo);
    expect(hero).toContain(copy.hero.demoNote);
    expect(hero).toContain('href="#day"');
    expect(html).toContain('YOUR NEXT MOVE STARTS HERE.');
    const heading = html.match(/<h1\b[^>]*>(.*?)<\/h1>/s)?.[1]?.replaceAll(/<[^>]*>/g, '').replaceAll(/\s+/g, ' ').trim();
    expect(heading).toBe('YOUR NEXT MOVE STARTS HERE.');
    expect(html).not.toMatch(/offline|أوفلاين|من غير نت|بدون اتصال|النت فاصل|white-label/i);
    expect(copy.faq).toHaveLength(4);
    expect(copy.features).toHaveLength(8);
    expect(copy.features.filter(feature => feature.soon)).toHaveLength(2);
    expect(html.split(copy.soon)).toHaveLength(3);
    expect(html).toContain('© Gym visual');
    expect(copy.plans.map(plan => [plan.price, plan.limit])).toEqual([[0, 5], [399, 20], [699, 40], [1499, 100]]);
    const pricing = renderToStaticMarkup(parts[1]);
    const cards = [...pricing.matchAll(/<article\b[^>]*>(.*?)<\/article>/gs)];
    expect(cards).toHaveLength(4);
    cards.forEach((card, index) => {
      for (const feature of copy.plans[index]?.checklist ?? []) expect(card[1]).toContain(feature);
    });
    expect(pricing).toMatch(/LEGEND<\/h3><span[^>]*>.*?<\/span><\/div>/);
    locale.value = 'ar';
  });
  it('gives every plan an independent inclusion list', () => {
    const copy = getContent(createT(messages, 'ar'));
    expect(copy.plans[0]?.checklist).not.toBe(copy.plans[1]?.checklist);
  });
  it('keeps every locale free of connection claims and preserves the English slogan', () => {
    vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
    try {
      for (const dictionary of [messages.ar, messages.arStd, messages.en]) {
        expect(JSON.stringify(dictionary)).not.toMatch(/offline|أوفلاين|من غير نت|بدون اتصال|النت فاصل/i);
        expect(dictionary?.sloganLabel).toBe('YOUR NEXT MOVE STARTS HERE.');
      }
      const standard = getContent(createT(messages, 'ar', 'standard'));
      expect(standard.features.filter(feature => feature.soon)).toHaveLength(2);
      expect(standard.faq).toHaveLength(4);
      expect(standard.hero.description).toContain('يسجّل');
    } finally { vi.unstubAllEnvs(); }
  });
  it('mounts only the approved sections and drops the white-label strip', () => {
    const route = readFileSync('src/app/[locale]/page.tsx', 'utf8');
    expect(route).not.toMatch(/WhiteLabel|PlayerSection|StatsStrip/);
    expect(route.indexOf('<WhyKochivo')).toBeLessThan(route.indexOf('<HowItWorks'));
    expect(route.indexOf('<HowItWorks')).toBeLessThan(route.indexOf('<FeaturesGrid'));
  });
});

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '@/core/i18n/client';
import { describe, expect, it, vi } from 'vitest';

const locale = vi.hoisted(() => ({ value: 'ar' }));
vi.mock('server-only', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => {} }) }));
vi.mock('@/core/storage/media-url', () => ({ exerciseMediaUrl: (path: string) => `https://demo.supabase.co/${path}` }));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: locale.value }) }) }));
import { Hero } from './components/hero';
import { PlayerSection } from './components/player-section';
import { SiteFooter } from './components/site-footer';
import { content } from './content';
import { SiteHeader } from './components/site-header';
import { Pricing } from './components/pricing';
import { FinalCta } from './components/final-cta';

describe('public marketing page', () => {
  it.each(['ar', 'en'] as const)('routes auth and demo CTAs by label in %s', async language => {
    locale.value = language;
    try {
      const elements = await Promise.all([SiteHeader(), Hero(), Pricing(), FinalCta(), SiteFooter()]);
      const html = elements.map(element => renderToStaticMarkup(createElement(LocaleProvider, { locale: language }, element))).join('');
      const links = [...html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>(.*?)<\/a>/gs)]
        .map(match => ({ href: match[1], label: match[2]?.replace(/<[^>]+>/g, '') }));
      const labels = language === 'ar'
        ? ['دخول', 'ابدأ مجاناً', 'ابدأ مجاناً · لحد 5 لاعبين', 'اعمل حسابك كابتن', 'جرّب الديمو']
        : ['Sign in', 'Start free', 'Start free · up to 5 players', 'Create your coach account', 'Try the demo'];
      for (const label of labels) expect(links.some(link => link.label === label)).toBe(true);
      for (const link of links.filter(link => labels.includes(link.label ?? ''))) {
        expect(link.href).toBe(link.label === labels[0] ? '/login' : link.label === labels[4] ? '/demo' : '/login?tab=signup');
      }
      expect(links.some(link => link.label === labels[0])).toBe(true);
    } finally { locale.value = 'ar'; }
  });
  it.each([['ar', 'خطوتك الجاية بتبدأ من هنا'], ['en', null]] as const)('renders the hero in %s', async (language, tagline) => {
    locale.value = language;
    try {
      const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: language }, await Hero()));
      // The slogan is an English brand mark in both locales; the Arabic tagline translates it,
      // and English shows no tagline because it would repeat the slogan.
      expect(html).toContain('<h1 aria-label="Your next move starts here" class="marketing-slogan" dir="ltr" lang="en">');
      if (tagline) expect(html).toContain(tagline);
      else expect(html.split('Your next move starts here')).toHaveLength(2);
      if (language === 'en') expect(html).not.toMatch(/[\u0600-\u06ff]/);
    } finally { locale.value = 'ar'; }
  });
  it('offers four plans with increasing prices and player limits', () => {
    expect(content.plans).toHaveLength(4);
    content.plans.slice(1).forEach((plan, index) => {
      expect(plan.price).toBeGreaterThan(content.plans[index]?.price ?? Infinity);
      expect(plan.limit).toBeGreaterThan(content.plans[index]?.limit ?? Infinity);
    });
  });
  it('answers every FAQ question', () => {
    expect(content.faq.length).toBeGreaterThan(0);
    content.faq.forEach(({ q, a }) => {
      expect(q.trim()).not.toBe('');
      expect(a.trim()).not.toBe('');
    });
  });
  it('credits the exercise media', () => {
    expect(content.footer.credit).toContain('© Gym visual');
  });
  it('renders one heading and public entry links with server-visible previews', async () => {
    const html = (await Promise.all([Hero(), PlayerSection(), SiteFooter()])).map(element => renderToStaticMarkup(element)).join('');
    expect(html.match(/<h1\b/g)).toHaveLength(1);
    expect(html).toContain('href="/login?tab=signup"');
    expect(html).toContain('href="/demo"');
    expect(html).toContain('جرّب الديمو');
    expect(html).toContain('لوحة كابتن ببيانات تجريبية لمدة 24 ساعة، من غير دعوات');
    expect(html).toContain('© Gym visual');
    expect(html).toContain('معاينة توضيحية · بيانات مثال');
    expect(html).toContain('بنش بريس بالبار');
    expect(html).toContain('كريم عادل');
  });
});

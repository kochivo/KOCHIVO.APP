import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { LocaleProvider } from '@/core/i18n/client';
import { describe, expect, it, vi } from 'vitest';

const locale = vi.hoisted(() => ({ value: 'ar' }));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: locale.value }) }) }));
import { Hero } from './components/hero';
import { PlayerSection } from './components/player-section';
import { SiteFooter } from './components/site-footer';
import { content } from './content';

describe('public marketing page', () => {
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
    expect(html).toContain('لوحة كابتن ببيانات تجريبية لمدة ٢٤ ساعة، من غير دعوات');
    expect(html).toContain('© Gym visual');
    expect(html).toContain('معاينة توضيحية · بيانات مثال');
    expect(html).toContain('بنش بريس بالبار');
    expect(html).toContain('كريم عادل');
  });
});

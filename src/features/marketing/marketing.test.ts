import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { Hero } from './components/hero';
import { PlayerSection } from './components/player-section';
import { SiteFooter } from './components/site-footer';
import { content } from './content';

describe('public marketing page', () => {
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
  it('renders one heading and public entry links with server-visible previews', () => {
    const html = [Hero, PlayerSection, SiteFooter].map((component) => renderToStaticMarkup(createElement(component))).join('');
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

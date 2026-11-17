import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Home, MessageCircle, TrendingUp, Utensils } from 'lucide-react';
import { afterEach, expect, it, vi } from 'vitest';
import { playerNav } from './nav';
import { KoHome, KoPlayerFood, KoProgress, KoForms } from '@/ui/icons';

afterEach(() => vi.unstubAllEnvs());

it('keeps every legacy player icon and its markup when the flag is off', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '0');
  const icons = [Home, Utensils, TrendingUp, MessageCircle];
  playerNav('/player').forEach((item, index) => {
    const Icon = icons[index];
    if (!Icon) throw new Error('Unexpected navigation item');
    expect(item.icon).toBe(Icon);
    expect(renderToStaticMarkup(createElement(item.icon, { 'aria-hidden': true, className: 'size-5' })))
      .toBe(renderToStaticMarkup(createElement(Icon, { 'aria-hidden': true, className: 'size-5' })));
  });
});

it('uses engraved icons for all four player tabs', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  const items = playerNav('/player/nutrition');
  expect(items).toHaveLength(4);
  expect(items.map(item => item.icon)).toEqual([KoHome, KoPlayerFood, KoProgress, KoForms]);
  for (const item of items) expect(renderToStaticMarkup(createElement(item.icon))).toContain('<pattern');
  expect(items.find(item => item.active)?.href).toBe('/player/nutrition');
});

it('labels the existing refined destinations in mockup order', () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1');
  expect(playerNav('/player', 'ar').map(item => item.label)).toEqual(['النهارده', 'الأكل', 'التقدم', 'التقييمات']);
  expect(playerNav('/player', 'en').map(item => item.label)).toEqual(['Today', 'Food', 'Progress', 'Assessments']);
  expect(playerNav('/player', 'ar', 'standard').map(item => item.label)).toEqual(['اليوم', 'الطعام', 'التقدم', 'التقييمات']);
});

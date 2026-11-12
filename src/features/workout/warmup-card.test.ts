import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { WarmupCard } from './components/warmup-card';
import { emptyWarmup, type DayWarmup } from '@/features/programs';
vi.mock('server-only', () => ({}));
const warmup: DayWarmup = { ramp: false, items: [
  { id: 'a', name: 'عجلة خفيفة', amount: 5, unit: 'min' },
  { id: 'b', name: 'دوران كتف وأكواع', amount: 10, unit: 'times' },
  { id: 'c', name: 'مطاطة: فتح صدر', amount: 15, unit: 'reps' },
] };
const render = (value: DayWarmup, locale: 'ar' | 'en' = 'ar') => renderToStaticMarkup(createElement(LocaleProvider, { locale },
  createElement(WarmupCard, { warmup: value, checked: ['a', 'b'], disabled: false, onToggle() {} })));
it('renders nothing for an empty or ramp-only warm-up', () => {
  expect(render(emptyWarmup())).toBe('');
  expect(render({ items: [], ramp: true })).toBe('');
});
it('matches phone checklist copy, units, amber styling and accessible touch targets', () => {
  const html = render(warmup);
  expect(html).toContain('1 · سخّن الأول');
  for (const text of ['عجلة خفيفة', 'دوران كتف وأكواع', 'مطاطة: فتح صدر', '5 د', '10×', '15×']) expect(html).toContain(text);
  expect(html.match(/type="checkbox"/g)).toHaveLength(3);
  expect(html.match(/checked=""/g)).toHaveLength(2);
  expect(html).toContain('border-warn/35');
  expect(html).toContain('min-h-12');
});
it('translates all warm-up units in English', () => {
  const html = render({ items: [{ id: 'd', name: 'Walk', amount: 30, unit: 'sec' }], ramp: false }, 'en');
  expect(html).toContain('Warm up first');
  expect(html).toContain('30 sec');
  expect(html).not.toMatch(/[\u0600-\u06ff]/u);
});

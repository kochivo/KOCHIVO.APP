import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { CheckinSheet } from './components/checkin-sheet';
import { LineChart } from './components/line-chart';
import { ProgressGallery } from './components/progress-gallery';

it('renders progress in English', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(LineChart, { points: [], title: 'Weight', unit: 'kg' })));
  expect(html).toContain('No measurements yet');
  expect(html).not.toMatch(/[\u0600-\u06ff]/u);
});

it('renders both chart scales, accessible data and the latest values', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(LineChart, { points: [{ date: '2026-11-03', value: 75 }],
      bodyFat: [{ date: '2026-11-03', value: 18 }], title: 'Weight', unit: 'kg' })));
  expect(html).toContain('Weight: 75 kg');
  expect(html).toContain('Body fat: 18 %');
  expect(html).toContain('Show measurement table');
  expect(html).toContain('aria-expanded="false"');
  expect(html).toContain('<table');
  expect(html).toContain('text-muted');
});

it('renders legacy gallery photos by week and an empty state', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement(ProgressGallery, { weeks: [
      { date: '2026-10-03', weight: 80, photos: [{ url: 'old.jpg', pose: 'photo' }] },
      { date: '2026-10-17', weight: 78, photos: [{ url: 'new.jpg', pose: 'side' }] },
    ] })));
  expect(html.indexOf('17 October 2026')).toBeLessThan(html.indexOf('3 October 2026'));
  expect(html).toContain('>Photo</p>');
  expect(html).toContain('loading="lazy"');
  expect(html).toContain('Compare');
  const empty = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(ProgressGallery, { weeks: [] })));
  expect(empty).toContain("Comparison photos aren&#x27;t available yet");
});

it('translates photo controls and chart dates in English', () => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' },
    createElement('div', null,
      createElement(CheckinSheet, { open: false, onClose: () => undefined, onSent: () => undefined }),
      createElement(LineChart, { points: [{ date: '2026-11-03', value: 75 }], title: 'Weight', unit: 'kg' }))));
  expect(html).toContain('Front photo');
  expect(html).toContain('3 November 2026');
  expect(html).not.toMatch(/[\u0600-\u06ff]/u);
});


import { renderToStaticMarkup } from 'react-dom/server';
import { readFileSync } from 'node:fs';
import { expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'ar' }) }) }));
import { Pricing } from './components/pricing';
import { Faq } from './components/faq';

const css = readFileSync(new URL('./components/landing.module.css', import.meta.url), 'utf8');

it('renders mobile snap plans with all four keyboard-accessible actions', async () => {
  const html = renderToStaticMarkup(await Pricing());
  expect(html).toContain('snap-x snap-mandatory');
  expect(html.match(/snap-start/g)).toHaveLength(4);
  expect(html.match(/<article/g)).toHaveLength(4);
  expect(html.match(/<a /g)).toHaveLength(4);
  expect(css).toMatch(/@media \(max-width: 620px\)[\s\S]*?\.plans\s*\{[^}]*grid-auto-columns: 85%/);
});

it('gives every FAQ chevron the same centered SVG box while retaining the open answer', async () => {
  const html = renderToStaticMarkup(await Faq());
  expect(html.match(/<svg[^>]*class="[^"]*size-5 shrink-0/g)).toHaveLength(5);
  expect(html.match(/<details[^>]*open=""/g)).toHaveLength(1);
  expect(css).not.toContain('.faq summary::after');
});

it('pads desktop nav links to at least 48px wide', () => {
  expect(css).toMatch(/\.headerRow nav a\s*\{[^}]*min-inline-size: 48px;[^}]*padding-inline: var\(--spacing-inline\)/);
});


import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Home } from 'lucide-react';
import { expect, it, vi } from 'vitest';
import { BottomNav } from './bottom-nav';
import { PillNav } from './pill-nav';
import type * as LinkModule from 'next/link';
import { KoHome } from './icons/ko-home';

const status = vi.hoisted(() => ({ pending: false }));
vi.mock('next/link', async importOriginal => ({
  ...await importOriginal<typeof LinkModule>(),
  useLinkStatus: () => status,
}));

const pillItems = [
  { href: '/player', label: 'Home', icon: Home, active: true },
  { href: '/player/nutrition', label: 'Food', icon: Home },
];

it('shows every player tab label and marks the active page', () => {
  const html = renderToStaticMarkup(createElement(PillNav, { items: pillItems }));
  expect(html.match(/aria-current="page"/g)).toHaveLength(1);
  expect(html).toContain('>Home</span>');
  expect(html).toContain('>Food</span>');
  expect(html.match(/min-h-12/g)).toHaveLength(2);
  expect(html.match(/<svg/g)).toHaveLength(2);
});

it('uses mood-aware tokens and safe-area spacing inside a rest frame', () => {
  const html = renderToStaticMarkup(createElement('div', { 'data-mood': 'rest' },
    createElement(PillNav, { items: pillItems })));
  expect(html).toContain('bg-bg/95');
  expect(html).toContain('text-lime');
  expect(html).toContain('text-faint');
  expect(html).toContain('inset-x-0 bottom-0');
  expect(html).toContain('border-t');
  expect(html).toContain('var(--safe-bottom)');
  expect(html).toContain('var(--nav-height)');
  expect(html).not.toMatch(/#[\da-f]{3,8}\b/i);
});

it('preserves the default bar markup when bar is explicitly selected', () => {
  const implicit = renderToStaticMarkup(createElement(BottomNav, { items: pillItems }));
  const explicit = renderToStaticMarkup(createElement(BottomNav, { items: pillItems }));
  expect(explicit).toBe(implicit);
  expect(implicit).toContain('group/nav sheet fixed');
  expect(implicit).toContain('rounded-control px-inline py-inline');
  expect(implicit).toContain('>Food</span>');
});

it('keeps pending navigation feedback in pill links', () => {
  status.pending = true;
  const html = renderToStaticMarkup(createElement(PillNav, { items: pillItems }));
  status.pending = false;
  expect(html).toContain('data-pending="true"');
  expect(html).toContain('animate-pulse');
});

it('shows pending link feedback in the same fixed-size nav item', () => {
  const render = () => renderToStaticMarkup(createElement(BottomNav, { items: [
    { href: '/player', label: 'Home', icon: Home },
  ] }));
  status.pending = false;
  const idle = render();
  status.pending = true;
  const pending = render();
  expect(idle).toContain('data-pending="false"');
  expect(pending).toContain('data-pending="true"');
  expect(pending).toContain('text-lime');
  expect(pending.match(/<svg/g)).toHaveLength(1);
  expect(pending.match(/<a /g)).toHaveLength(1);
});

it('keeps engraved outlines unfilled and switches the hatch for active and pending links', () => {
  const render = (active: boolean) => renderToStaticMarkup(createElement(BottomNav, { items: [
    { href: '/player', label: 'Home', icon: KoHome, engraved: true, active },
  ] }));
  status.pending = false;
  expect(render(false)).toContain('text-ivory-muted');
  const active = render(true);
  expect(active).toContain('text-ivory');
  expect(active).toContain('class="text-lime"');
  expect(active).not.toContain('fill-current');
  expect(active).toContain('aria-current="page"');
  status.pending = true;
  expect(render(false)).toContain('class="text-lime"');
  status.pending = false;
});

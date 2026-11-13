import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Home } from 'lucide-react';
import { expect, it, vi } from 'vitest';
import { BottomNav } from './bottom-nav';
import type * as LinkModule from 'next/link';
import { KoHome } from './icons/ko-home';

const status = vi.hoisted(() => ({ pending: false }));
vi.mock('next/link', async importOriginal => ({
  ...await importOriginal<typeof LinkModule>(),
  useLinkStatus: () => status,
}));

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

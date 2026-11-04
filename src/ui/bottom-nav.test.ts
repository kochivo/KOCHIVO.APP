import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Home } from 'lucide-react';
import { expect, it, vi } from 'vitest';
import { BottomNav } from './bottom-nav';
import type * as LinkModule from 'next/link';

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

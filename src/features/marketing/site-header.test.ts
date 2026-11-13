import { createElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { IconButton } from '@/ui/icon-button';

const hooks = vi.hoisted(() => ({ open: false, effects: [] as (() => void | (() => void))[], refs: [] as unknown[] }));
vi.mock('react', async importOriginal => ({
  ...await importOriginal<typeof React>(),
  useState: () => [hooks.open, (value: boolean) => { hooks.open = value; }],
  useEffect: (effect: () => void | (() => void)) => { hooks.effects.push(effect); },
  useRef: () => ({ current: hooks.refs.shift() ?? null }),
  useId: () => 'site-menu-test',
}));
vi.mock('server-only', () => ({}));
vi.mock('next/headers', () => ({ cookies: async () => ({ get: () => ({ value: 'en' }) }) }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: vi.fn() }) }));
import { SiteHeader } from './components/site-header';
import { SiteMenu } from './components/site-menu';

function find(node: ReactNode, type: string): ReactElement<Record<string, unknown>> {
  if (isValidElement<{ children?: ReactNode }>(node)) {
    if (node.type === type || type === 'button' && node.type === IconButton) return node as ReactElement<Record<string, unknown>>;
    for (const child of [node.props.children].flat()) {
      try { return find(child, type); } catch { /* Search the next sibling. */ }
    }
  }
  throw new Error(`Missing ${type}`);
}
const menu = () => SiteMenu({ openLabel: 'Open menu', closeLabel: 'Close menu', children: createElement('a', { href: '#faq' }, 'FAQ') });

beforeEach(() => { hooks.open = false; hooks.effects = []; hooks.refs = []; });

describe('marketing header', () => {
  it('keeps the status bar above the content row and inside the header background', async () => {
    const header = find(await SiteHeader(), 'header');
    expect(header.props.className).toContain('pt-[var(--safe-top)]');
    expect(header.props.style).toEqual({ backgroundImage: 'linear-gradient(to bottom, var(--color-bg) var(--safe-top), transparent var(--safe-top))' });
    expect(find(menu(), 'nav').props.className).toContain('h-[calc(100dvh-4rem-var(--safe-top))]');
  });
  it('keeps mobile and tablet controls in one row and desktop links behind lg', async () => {
    const html = renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, await SiteHeader()));
    expect(html).toContain('flex flex-nowrap items-center justify-between h-16');
    expect(html).toContain('hidden lg:flex');
    expect(html).not.toContain('md:flex');
    expect(html).toContain('lg:hidden');
    expect(html).toContain('aria-expanded="false"');
    expect(html).toContain('aria-label="Open menu"');
    const header = find(await SiteHeader(), 'header');
    const row = header.props.children as ReactElement<{ className: string }>;
    expect(row.props.className.split(' ')).not.toContain('flex-wrap');
  });
  it('toggles the panel with an accessible button', () => {
    const button = find(menu(), 'button');
    expect(button.props['aria-expanded']).toBe(false);
    (button.props.onClick as () => void)();
    const opened = menu();
    expect(find(opened, 'button').props['aria-expanded']).toBe(true);
    expect(find(opened, 'nav').props.hidden).toBe(false);
  });
  it.each(['escape', 'outside', 'link', 'desktop'] as const)('closes on %s and returns focus', action => {
    hooks.open = true;
    const focus = vi.fn();
    const firstFocus = vi.fn();
    const trigger = { focus, contains: () => false, closest: () => ({ querySelector: () => ({ focus }) }) };
    hooks.refs = [trigger, { contains: () => false, querySelector: () => ({ focus: firstFocus }) }];
    const listeners = new Map<string, (event: unknown) => void>();
    const media = { matches: false, addEventListener: (_: string, listener: () => void) => listeners.set('resize', listener),
      removeEventListener: () => listeners.delete('resize') };
    vi.stubGlobal('matchMedia', () => media);
    vi.stubGlobal('document', {
      activeElement: trigger,
      addEventListener: (name: string, listener: (event: unknown) => void) => listeners.set(name, listener),
      removeEventListener: (name: string) => listeners.delete(name),
    });
    vi.stubGlobal('Node', class {});
    try {
      const tree = menu();
      const cleanup = hooks.effects[0]?.();
      expect(firstFocus).toHaveBeenCalledOnce();
      if (action === 'escape') listeners.get('keydown')?.({ key: 'Escape', preventDefault: vi.fn() });
      if (action === 'outside') listeners.get('pointerdown')?.({ target: new Node() });
      if (action === 'link') (find(tree, 'nav').props.onClick as (event: unknown) => void)({ target: { closest: () => ({}) } });
      if (action === 'desktop') { media.matches = true; listeners.get('resize')?.({}); }
      expect(hooks.open).toBe(false);
      expect(focus).toHaveBeenCalledOnce();
      cleanup?.();
      expect(listeners.size).toBe(0);
    } finally { vi.unstubAllGlobals(); }
  });
});

import { createElement } from 'react';
import type * as React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';

const state = vi.hoisted(() => ({ values: [] as unknown[], index: 0 }));
vi.mock('react', async original => {
  const react = await original<typeof React>();
  return { ...react, useState: (initial: unknown) => {
    const index = state.index++;
    return [index in state.values ? state.values[index] : typeof initial === 'function' ? initial() : initial, () => {}];
  } };
});
vi.mock('next/navigation', () => ({ useRouter: () => ({ push() {}, refresh() {} }) }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success() {}, error() {} }) }));
beforeEach(() => { state.values = []; state.index = 0; });
const render = (element: React.ReactElement) => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, element));
import { PackagesCard } from './components/packages-card';
vi.mock('./data/finance-actions', () => ({ archivePackage() {}, createPackage() {} }));
it('invites creating the first package in the empty state', () => {
 const html = render(createElement(PackagesCard, { packages: [], onChange() {} }));
 expect(html).toContain('<h2 class="text-xl font-bold">No packages yet</h2>');
 expect(html).toContain('>New package</button>');
});

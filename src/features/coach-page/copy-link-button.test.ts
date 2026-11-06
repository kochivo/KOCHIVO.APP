import type * as React from 'react';
import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { CopyLinkButton } from './components/copy-link-button';

const state = vi.hoisted(() => ({ status: '', locale: 'en' as 'en' | 'ar' }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: () => [state.status, (value: string) => { state.status = value; }],
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => createT(messages, state.locale) }));
beforeEach(() => { state.status = ''; state.locale = 'en'; });
afterEach(() => vi.unstubAllGlobals());

async function click() {
  const element = CopyLinkButton({ url: 'https://kochivo.site/c/ali-coach' });
  const button = element.props.children[0] as ReactElement<{ onClick: () => Promise<void> }>;
  await button.props.onClick();
  return renderToStaticMarkup(CopyLinkButton({ url: 'https://kochivo.site/c/ali-coach' }));
}
it.each(['en', 'ar'] as const)('copies the full URL and announces success in %s', async locale => {
  state.locale = locale;
  let copied = '';
  vi.stubGlobal('navigator', { clipboard: { writeText: async (value: string) => { copied = value; } } });
  const html = await click();
  expect(copied).toBe('https://kochivo.site/c/ali-coach');
  expect(html).toContain(`role="status" class="text-sm text-muted">${locale === 'en' ? 'Copied' : 'اتنسخ'}</p>`);
});
it.each(['en', 'ar'] as const)('announces a failed clipboard write in %s', async locale => {
  state.locale = locale;
  vi.stubGlobal('navigator', { clipboard: { writeText: async () => { throw new Error('denied'); } } });
  const html = await click();
  expect(html).toContain(locale === 'en' ? 'Could not copy the link. Copy it manually' : 'مش قادرين ننسخ اللينك. انسخه يدويًا');
  expect(html).toContain('role="status"');
});

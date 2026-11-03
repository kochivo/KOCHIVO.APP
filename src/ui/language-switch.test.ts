import { Children, isValidElement } from 'react';
import type { ReactNode } from 'react';
import type * as ReactModule from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { LanguageSwitch } from './language-switch';

const state = vi.hoisted(() => ({ locale: 'ar' as 'ar' | 'en', error: false, work: Promise.resolve(), refresh: vi.fn(), setLocale: vi.fn() }));
vi.mock('react', async original => ({
  ...await original<typeof ReactModule>(),
  useState: () => [state.error, (value: boolean) => { state.error = value; }],
  useTransition: () => [false, (work: () => Promise<void>) => { state.work = work(); }],
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: state.refresh }) }));
vi.mock('@/core/i18n/set-locale', () => ({ setLocale: state.setLocale }));
vi.mock('@/core/i18n/client', () => ({
  useLocale: () => state.locale,
  useT: (messages: Parameters<typeof createT>[0]) => createT(messages, state.locale),
}));

function button(language: string, node: ReactNode = LanguageSwitch()): (() => void) | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ lang?: string; children?: ReactNode; onClick?: () => void }>(child)) continue;
    if (child.props.lang === language) return child.props.onClick;
    const found = button(language, child.props.children);
    if (found) return found;
  }
}

beforeEach(() => { vi.clearAllMocks(); state.error = false; state.locale = 'ar'; });

it('refreshes only after the cookie action succeeds, without a reload', async () => {
  let finish = () => {};
  const action = new Promise<void>(resolve => { finish = resolve; });
  state.setLocale.mockReturnValue(action);
  expect(renderToStaticMarkup(LanguageSwitch())).toContain('aria-pressed="true"');
  button('ar')?.();
  expect(state.setLocale).not.toHaveBeenCalled();
  button('en')?.();
  expect(state.setLocale).toHaveBeenCalledWith('en');
  expect(state.refresh).not.toHaveBeenCalled();
  finish();
  await state.work;
  expect(state.refresh).toHaveBeenCalledOnce();
});

it('shows a retryable error when changing the cookie fails', async () => {
  state.setLocale.mockRejectedValue(new Error('offline'));
  button('en')?.();
  await state.work;
  expect(state.refresh).not.toHaveBeenCalled();
  expect(renderToStaticMarkup(LanguageSwitch())).toContain('مش قادرين نغيّر اللغة. جرّب تاني');
});

it('offers only the other language in compact mode', async () => {
  state.setLocale.mockResolvedValue(undefined);
  const node = LanguageSwitch({ compact: true });
  const html = renderToStaticMarkup(node);
  expect(html.match(/<button/g)).toHaveLength(1);
  expect(html).toContain('English');
  button('en', node)?.();
  await state.work;
  expect(state.setLocale).toHaveBeenCalledWith('en');
});

it('offers Arabic from the English compact header', () => {
  state.locale = 'en';
  const html = renderToStaticMarkup(LanguageSwitch({ compact: true }));
  expect(html.match(/<button/g)).toHaveLength(1);
  expect(html).toContain('العربية');
  expect(html).not.toContain('aria-pressed=');
});

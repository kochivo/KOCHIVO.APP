import { Children, isValidElement } from 'react';
import type { ReactNode } from 'react';
import type * as ReactModule from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
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
  useArabicStyle: () => 'egyptian',
  useT: (messages: Parameters<typeof createT>[0]) => createT(messages, state.locale),
}));

function button(language: string, node: ReactNode = LanguageSwitch(), label?: string): (() => void) | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ lang?: string; children?: ReactNode; onClick?: () => void }>(child)) continue;
    if (child.props.lang === language && (!label || child.props.children === label)) return child.props.onClick;
    const found = button(language, child.props.children, label);
    if (found) return found;
  }
}

beforeEach(() => { vi.clearAllMocks(); vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '0'); state.error = false; state.locale = 'ar'; });
afterEach(() => vi.unstubAllEnvs());

it('renders the exact legacy two-button markup with the flag off', () => {
  const classes = 'min-h-12 rounded-control px-3 text-sm text-muted aria-pressed:bg-surface-raised aria-pressed:font-bold aria-pressed:text-ink disabled:opacity-40';
  expect(renderToStaticMarkup(LanguageSwitch())).toBe(`<div><div role="group" aria-label="اللغة" class="flex gap-1"><button type="button" lang="ar" aria-pressed="true" class="${classes}">العربية</button><button type="button" lang="en" aria-pressed="false" class="${classes}">English</button></div></div>`);
});

it('offers three choices and persists a style change on the same Arabic locale', async () => {
  vi.stubEnv('NEXT_PUBLIC_INTERNATIONAL', '1'); state.setLocale.mockResolvedValue(undefined);
  const node = LanguageSwitch();
  const html = renderToStaticMarkup(node);
  expect(html.match(/<button/g)).toHaveLength(3);
  expect(html).toContain('عربي مصري'); expect(html).toContain('عربي فصحى');
  button('ar', node, 'عربي فصحى')?.(); await state.work;
  expect(state.setLocale).toHaveBeenCalledWith('ar', 'standard');
  expect(state.refresh).toHaveBeenCalledOnce();
});

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

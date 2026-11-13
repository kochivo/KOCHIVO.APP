import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { LoginMethods } from './components/login-methods';

const mock = vi.hoisted(() => ({ installed: false, values: [] as unknown[], index: 0, send: vi.fn(), verify: vi.fn(), password: vi.fn(), assign: vi.fn(), work: Promise.resolve() }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useSyncExternalStore: () => mock.installed,
  useState: (initial: unknown) => { const i = mock.index++; if (!(i in mock.values)) mock.values[i] = initial;
    return [mock.values[i], (value: unknown) => { mock.values[i] = value; }]; },
  useTransition: () => [false, (work: () => Promise<void>) => { mock.work = work(); }],
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => createT(messages, 'ar'), useLocale: () => 'ar' }));
vi.mock('./data/sign-in-email-code', () => ({ sendSignInEmailCode: mock.send, verifySignInEmailCode: mock.verify }));
vi.mock('./data/sign-in-password', () => ({ signInPassword: mock.password }));
vi.mock('./data/client-action', () => ({ callAuthAction: (action: () => Promise<unknown>) => action() }));
type Props = { children?: unknown; value?: string; name?: string; href?: string; options?: unknown;
  onChange?: (value: string | { target: { value: string } }) => void; onSubmit?: (event: { preventDefault: () => void }) => void };
function nodes(value: unknown): ReactElement<Props>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return isValidElement<Props>(value) ? [value, ...nodes(value.props.children)] : [];
}
function render() { mock.index = 0; return nodes(LoginMethods()); }
beforeEach(() => {
  vi.clearAllMocks(); mock.values = []; mock.installed = false;
  mock.send.mockResolvedValue({ codeEmail: 'player@example.com', message: messages.ar.emailCodeNeutral });
  mock.verify.mockResolvedValue({ redirect: '/player' });
  vi.stubGlobal('window', { location: { assign: mock.assign } });
});
afterEach(() => vi.unstubAllGlobals());
it.each([[false, 'password'], [true, 'email-code']] as const)('defaults installed=%s to %s', (installed, expected) => {
  mock.installed = installed;
  expect(render().find(node => node.props.options)?.props.value).toBe(expected);
});
it('lets the user switch away from the installed default', () => {
  mock.installed = true;
  render().find(node => node.props.options)?.props.onChange?.('password');
  expect(render().find(node => node.props.name === 'password')).toBeDefined();
});
it('sends a code, displays the neutral message, verifies and navigates', async () => {
  mock.installed = true;
  render().find(node => node.props.name === 'email')?.props.onChange?.({ target: { value: 'player@example.com' } });
  render().find(node => node.type === 'form')?.props.onSubmit?.({ preventDefault() {} }); await mock.work;
  expect(mock.send).toHaveBeenCalledWith({ email: 'player@example.com' });
  let tree = render();
  expect(tree.some(node => node.props.children === messages.ar.emailCodeNeutral)).toBe(true);
  const otp = tree.find(node => node.props.value === '' && node.props.onChange);
  otp?.props.onChange?.('123456');
  tree = render(); tree.find(node => node.type === 'form')?.props.onSubmit?.({ preventDefault() {} }); await mock.work;
  expect(mock.verify).toHaveBeenCalledWith({ email: 'player@example.com', token: '123456' });
  expect(mock.assign).toHaveBeenCalledWith('/player');
});

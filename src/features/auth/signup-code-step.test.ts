import { beforeEach, expect, it, vi } from 'vitest';
import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as ReactModule from 'react';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import { CoachSignup } from './components/coach-signup';
import { SignupCodeStep } from './components/signup-code-step';
import { OtpInput } from './components/otp-input';
import { ResendCodeButton } from './components/resend-code-button';
import { signUpPlayer, verifyPlayerCode } from './data/sign-up-player';
import { resendCaptainCode, verifyCaptainCode } from './data/sign-up-captain';

const hooks = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, tasks: [] as Promise<void>[] }));
vi.mock('react', async original => ({
  ...await original<typeof ReactModule>(),
  useState: (initial: unknown) => {
    const index = hooks.cursor++;
    if (!(index in hooks.slots)) hooks.slots[index] = typeof initial === 'function' ? initial() : initial;
    return [hooks.slots[index], (next: unknown) => {
      hooks.slots[index] = typeof next === 'function' ? next(hooks.slots[index]) : next;
    }];
  },
  useTransition: () => [false, (action: () => Promise<void>) => { hooks.tasks.push(action()); }],
  useEffect: () => {},
}));
vi.mock('@/core/i18n/client', () => ({ useT: () => createT(messages, 'en'), useLocale: () => 'en' }));
vi.mock('./data/sign-up-player', () => ({ signUpPlayer: vi.fn(), verifyPlayerCode: vi.fn() }));
vi.mock('./data/sign-up-captain', () => ({ verifyCaptainCode: vi.fn(), resendCaptainCode: vi.fn() }));
vi.mock('./data/sign-in-google', () => ({ signInGoogle: vi.fn() }));
vi.mock('@/core/i18n/set-locale', () => ({ setLocale: vi.fn() }));

type Node = ReactElement<Record<string, unknown>>;
function nodes(value: unknown): Node[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return isValidElement<Record<string, unknown>>(value) ? [value, ...nodes(value.props.children)] : [];
}
function render(component: () => ReactElement) { hooks.cursor = 0; return component(); }
async function submit(tree: ReactElement) {
  const form = nodes(tree).find(node => node.type === 'form');
  expect(form).toBeDefined();
  await (form?.props.onSubmit as (event: unknown) => void)({ preventDefault() {}, currentTarget: undefined });
  await Promise.all(hooks.tasks);
}
beforeEach(() => {
  hooks.slots = []; hooks.cursor = 0; hooks.tasks = []; vi.resetAllMocks();
  vi.mocked(verifyCaptainCode).mockResolvedValue({});
});

it('opens the shared code step after player signup and supplies the coach verification action', async () => {
  vi.mocked(signUpPlayer).mockResolvedValue({ codeEmail: 'ali@example.com', message: 'Check email' });
  const page = () => CoachSignup({ coach: 'ahmed' });
  await submit(render(page));
  const tree = render(page);
  const step = nodes(tree).find(node => node.type === SignupCodeStep);
  expect(step?.props.email).toBe('ali@example.com');
  expect(nodes(tree).some(node => node.type === 'form')).toBe(false);
  vi.mocked(verifyPlayerCode).mockResolvedValue({ error: 'Wrong code' });
  const verify = step?.props.verify as (input: unknown) => Promise<unknown>;
  expect(await verify({ email: 'ali@example.com', token: '123456' })).toEqual({ error: 'Wrong code' });
  expect(verifyPlayerCode).toHaveBeenCalledWith({ email: 'ali@example.com', token: '123456' }, 'ahmed', {});
});

it('uses the supplied verification action and calls onDone with its redirect', async () => {
  const verify = vi.fn().mockResolvedValue({ redirect: '/c/ahmed?requested=1' });
  const onDone = vi.fn();
  const step = () => SignupCodeStep({ email: 'ali@example.com', verify, onDone });
  const otp = nodes(render(step)).find(node => node.type === OtpInput);
  (otp?.props.onChange as (token: string) => void)('123456');
  await submit(render(step));
  expect(verify).toHaveBeenCalledWith({ email: 'ali@example.com', token: '123456' });
  expect(onDone).toHaveBeenCalledWith('/c/ahmed?requested=1');
});

it('keeps a wrong code visible and preserves captain verification by default', async () => {
  vi.mocked(verifyCaptainCode).mockResolvedValue({ error: 'Wrong code' });
  const step = () => SignupCodeStep({ email: 'coach@example.com' });
  const otp = nodes(render(step)).find(node => node.type === OtpInput);
  (otp?.props.onChange as (token: string) => void)('123456');
  await submit(render(step));
  expect(nodes(render(step)).find(node => node.props.role === 'alert')?.props.children).toBe('Wrong code');
  expect(verifyCaptainCode).toHaveBeenCalledWith({ email: 'coach@example.com', token: '123456' });
});

it('blocks resend until sixty seconds and reuses signup resend for the player step', async () => {
  vi.mocked(resendCaptainCode).mockResolvedValue({});
  const step = nodes(render(() => SignupCodeStep({ email: 'ali@example.com' }))).find(node => node.type === ResendCodeButton);
  expect(step).toBeDefined();
  const onResend = step?.props.onResend as () => void;
  let now = 1000;
  const button = () => ResendCodeButton({ sentAt: 1000, pending: false, onResend, now: () => now });
  expect(button().props.disabled).toBe(true);
  button().props.onClick();
  expect(resendCaptainCode).not.toHaveBeenCalled();
  now = 60999;
  expect(button().props.disabled).toBe(true);
  now = 61000;
  expect(button().props.disabled).toBe(false);
  await button().props.onClick();
  await Promise.all(hooks.tasks);
  expect(resendCaptainCode).toHaveBeenCalledWith({ email: 'ali@example.com' });
});

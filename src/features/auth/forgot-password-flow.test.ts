import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as React from 'react';
import { expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { ForgotPasswordFlow } from './components/forgot-password-flow';
import { messages } from './messages';

const mock = vi.hoisted(() => ({
  state: [] as unknown[], index: 0, work: Promise.resolve(), effects: [] as (() => void)[],
  request: vi.fn(), emailFocus: vi.fn(), editing: { current: false },
}));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: (initial: unknown) => {
    const index = mock.index++;
    if (!(index in mock.state)) mock.state[index] = initial;
    return [mock.state[index], (value: unknown) => { mock.state[index] = value; }];
  },
  useEffect: (effect: () => void) => { mock.effects.push(effect); },
  useTransition: () => [false, (work: () => Promise<void>) => { mock.work = work(); }],
  useRef: (initial: unknown) => initial === null ? { current: { querySelector: () => ({ focus: mock.emailFocus }) } } : mock.editing,
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({}) }));
vi.mock('@/ui/toast', () => ({ useToast: () => ({}) }));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'en', useT: () => createT(messages, 'en') }));
vi.mock('./data/request-reset', () => ({ requestReset: mock.request }));
vi.mock('./data/update-password', () => ({ updatePassword() {} }));

type Props = { children?: unknown; type?: string; value?: string; onClick?: () => void;
  onChange?: (event: { target: { value: string } }) => void; onSubmit?: (event: { preventDefault: () => void }) => void };
function nodes(value: unknown): ReactElement<Props>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return isValidElement<Props>(value) ? [value, ...nodes(value.props.children)] : [];
}
function render() {
  mock.index = 0;
  return nodes(ForgotPasswordFlow());
}

it('keeps the address editable and sends the next code to the corrected address', async () => {
  mock.request.mockResolvedValue({});
  vi.spyOn(Date, 'now').mockReturnValue(1000);
  try {
    render().find(node => node.props.type === 'email')?.props.onChange?.({ target: { value: 'typo@example.com' } });
    render().find(node => node.type === 'form')?.props.onSubmit?.({ preventDefault() {} });
    await mock.work;
    const sent = render();
    expect(sent.some(node => node.props.type === 'email')).toBe(false);
    const change = sent.find(node => node.props.children === messages.en.changeEmail);
    expect(change).toBeDefined();
    change?.props.onClick?.();
    const email = render().find(node => node.props.type === 'email');
    mock.effects.at(-1)?.();
    expect(mock.emailFocus).toHaveBeenCalledOnce();
    expect(email?.props.value).toBe('typo@example.com');
    email?.props.onChange?.({ target: { value: 'correct@example.com' } });
    render().find(node => node.type === 'form')?.props.onSubmit?.({ preventDefault() {} });
    await mock.work;
    expect(mock.request.mock.calls).toEqual([[{ email: 'typo@example.com' }], [{ email: 'correct@example.com' }]]);
  } finally { vi.restoreAllMocks(); }
});

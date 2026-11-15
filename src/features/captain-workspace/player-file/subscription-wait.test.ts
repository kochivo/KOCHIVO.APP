import { createElement } from 'react';
import type * as React from 'react';
import type * as Buttons from '@/ui/button';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { SubscriptionWaitEntry } from './subscription-wait-entry';
import { startSubscription } from './start-subscription';

const state = vi.hoisted(() => ({ click: undefined as (() => void) | undefined,
  pending: undefined as Promise<unknown> | undefined, refresh: vi.fn(), success: vi.fn(), error: vi.fn() }));
vi.mock('react', async original => ({ ...await original<typeof React>(),
  useState: (initial: unknown) => [initial, state.error],
  useTransition: () => [false, (action: () => Promise<unknown>) => { state.pending = action(); }],
}));
vi.mock('@/ui/button', async original => {
  const buttonModule = await original<typeof Buttons>();
  return { ...buttonModule, Button: (props: React.ComponentProps<typeof buttonModule.Button>) => {
    state.click = () => props.onClick?.({} as React.MouseEvent<HTMLButtonElement>);
    return createElement(buttonModule.Button, props);
  } };
});
vi.mock('@/ui/toast', () => ({ useToast: () => ({ success: state.success }) }));

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: state.refresh }) }));
vi.mock('./start-subscription', () => ({ startSubscription: vi.fn() }));
beforeEach(() => { vi.clearAllMocks(); state.click = undefined; state.pending = undefined; });

function render() {
  return renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, createElement(SubscriptionWaitEntry, {
    linkId: 'link', training: true, nutrition: false,
  })));
}

it.each(['ar', 'en'] as const)('renders the waiting explanation, missing plans and secondary start button in %s', locale => {
  const html = renderToStaticMarkup(createElement(LocaleProvider, { locale }, createElement(SubscriptionWaitEntry, {
    linkId: 'link', training: false, nutrition: true,
  })));
  expect(html).toContain(locale === 'en' ? 'Subscription starts when the training and nutrition plans are set' : 'الاشتراك هيبدأ لما تحط نظام التمرين ونظام الأكل');
  expect(html).toContain(locale === 'en' ? 'Training plan is missing' : 'نظام التمرين ناقص');
  expect(html).not.toContain(locale === 'en' ? 'Nutrition plan is missing' : 'نظام الأكل ناقص');
  expect(html).toContain(locale === 'en' ? 'Start subscription now' : 'ابدأ الاشتراك دلوقتي');
  expect(html).toContain('control-secondary');
  expect(html).not.toContain('control-primary');
});

it('starts the selected link, refreshes and shows the standard success popup', async () => {
  vi.mocked(startSubscription).mockResolvedValue({});
  expect(render()).toContain('Nutrition plan is missing');
  state.click?.();
  await state.pending;
  expect(startSubscription).toHaveBeenCalledWith('link');
  expect(state.refresh).toHaveBeenCalledOnce();
  expect(state.success).toHaveBeenCalledWith({ title: 'Subscription started', detail: 'Your subscription clock starts now', icon: 'payment' });
});
it.each(['returned', 'thrown'])('keeps an actionable error and avoids success for a %s failure', async failure => {
  if (failure === 'returned') vi.mocked(startSubscription).mockResolvedValue({ error: 'Try again' });
  else vi.mocked(startSubscription).mockRejectedValue(new Error('offline'));
  render(); state.click?.(); await state.pending;
  expect(state.error).toHaveBeenLastCalledWith(failure === 'returned' ? 'Try again' : 'Could not start subscription. Try again');
  expect(state.refresh).not.toHaveBeenCalled();
  expect(state.success).not.toHaveBeenCalled();
});

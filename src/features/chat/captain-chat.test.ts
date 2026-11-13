import { Children, createElement, isValidElement } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { ErrorState } from '@/ui/error-state';
import { CaptainChat } from './components/captain-chat-entry';

const thread = vi.hoisted(() => ({ status: 'ready', readError: false, items: [],
  refresh: vi.fn(), retry: vi.fn(), sendText: vi.fn(), sendVoice: vi.fn() }));
vi.mock('./hooks/use-chat-thread', () => ({ useChatThread: () => thread }));
vi.mock('@/features/voice-notes', async original => ({ ...await original<object>(),
  useRecorder: () => ({ state: { status: 'idle' } }),
}));
const props = { playerId: 'p', captainId: 'c', playerName: 'أحمد سامي' };
const render = () => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(CaptainChat, props)));
beforeEach(() => { thread.status = 'ready'; thread.readError = false; vi.clearAllMocks(); });
it('shows the captain empty state and personalized composer', () => {
  const html = render();
  expect(html).toContain('لسه مفيش رسايل');
  expect(html).toContain('placeholder="اكتب لأحمد"');
});
it('shows loading without a false empty state', () => {
  thread.status = 'loading';
  const html = render();
  expect(html).toContain('role="status"');
  expect(html).not.toContain('لسه مفيش رسايل');
});
it('shows a retryable load error without a false empty state', () => {
  thread.status = 'error';
  const html = render();
  expect(html).toContain('مش قادرين نحمّل الرسايل');
  expect(html).toContain('جرّب تاني');
  expect(html).not.toContain('لسه مفيش رسايل');
});
function find(node: ReactNode): ReactElement<{ onRetry: () => void }> | undefined {
  for (const child of Children.toArray(node)) {
    if (!isValidElement<{ children?: ReactNode }>(child)) continue;
    if (child.type === ErrorState) return child as ReactElement<{ onRetry: () => void }>;
    const result = find(child.props.children);
    if (result) return result;
  }
}
it('retries a failed read receipt through the same thread refresh', () => {
  thread.readError = true;
  let retry: (() => void) | undefined;
  function Capture() { retry = find(CaptainChat(props))?.props.onRetry; return null; }
  renderToStaticMarkup(createElement(LocaleProvider, { locale: 'ar' }, createElement(Capture)));
  expect(retry).toBeTypeOf('function');
  retry?.();
  expect(thread.refresh).toHaveBeenCalledOnce();
});

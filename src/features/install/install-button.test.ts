import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, expect, it, vi } from 'vitest';
import { createT } from '@/core/i18n/messages';
import { messages } from './messages';

const state = vi.hoisted(() => ({ platform: 'ios' as string }));
vi.mock('@/core/i18n/client', () => ({ useT: () => createT(messages, 'ar') }));
vi.mock('./hooks/use-install-prompt', () => ({
  useInstallPrompt: () => ({ platform: state.platform, install: vi.fn(), busy: false, error: false }),
}));
const { InstallButton } = await import('./components/install-button');
const render = () => renderToStaticMarkup(createElement(InstallButton));

beforeEach(() => { state.platform = 'ios'; });

it('offers the iPhone Share steps in a closable sheet', () => {
  const html = render();
  expect(html).toContain('تنزيل التطبيق');
  expect(html).toMatch(/<dialog[^>]*class="sheet /);
  expect(html).toContain('نزّل KOCHIVO على الآيفون');
  expect(html).toContain('اضغط على زرار المشاركة');
  expect(html).toContain('اقفل');
});

it('uses the native prompt on Android without a sheet', () => {
  state.platform = 'android';
  const html = render();
  expect(html).toContain('تنزيل التطبيق');
  expect(html).not.toContain('<dialog');
});

it.each(['installed', 'unsupported'])('hides when the app is %s', platform => {
  state.platform = platform;
  expect(render()).toBe('');
});

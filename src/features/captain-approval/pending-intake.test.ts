import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { expect, it, vi } from 'vitest';
import { LocaleProvider } from '@/core/i18n/client';
import { createT } from '@/core/i18n/messages';
import { messages } from './intake/messages';
import { PendingIntake } from './components/pending-intake';

const mocks = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('./data/intake', () => ({ loadIntake: mocks.load, saveIntake: vi.fn() }));
vi.mock('@/core/i18n/server', () => ({ getT: async () => createT(messages, 'en') }));
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh() {} }) }));
vi.mock('./components/captain-pending-screen', () => ({ CaptainPendingScreen: ({ status }: { status: string }) => createElement('p', null, status) }));
const render = async () => renderToStaticMarkup(createElement(LocaleProvider, { locale: 'en' }, await PendingIntake({ status: 'pending' })));
it('shows the prefilled form only before intake submission', async () => {
  mocks.load.mockResolvedValue({ profile: { full_name: 'Ali', social: { whatsapp: '+201012345678' }, captain_intake: null }, error: null });
  expect(await render()).toContain('value="Ali"');
  expect(await render()).toContain('value="+201012345678"');
  mocks.load.mockResolvedValue({ profile: { captain_intake: { current_tool: 'other_app' } }, error: null });
  expect(await render()).not.toContain('<form');
  expect(await render()).toContain('pending');
});
it('shows a retryable error instead of an empty form on read failure', async () => {
  mocks.load.mockResolvedValue({ profile: null, error: 'Could not load' });
  expect(await render()).toContain('role="alert"');
  expect(await render()).toContain('Try again');
  expect(await render()).not.toContain('<form');
});

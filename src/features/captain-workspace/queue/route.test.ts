import { createElement } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import InboxPage from '@/app/[locale]/(captain)/captain/inbox/page';
import { InboxScreen } from '@/features/inbox';
import { QueueEntry } from '../server';
vi.mock('@/features/inbox', () => ({ InboxScreen: () => null, messages: {} }));
vi.mock('../server', () => ({ QueueEntry: () => null }));
afterEach(() => vi.unstubAllEnvs());
it.each([undefined, '', '0', 'true'])('preserves the exact legacy tree when flag is %s', async flag => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', flag);
  expect(await InboxPage()).toEqual(createElement(InboxScreen));
});
it('renders the queue only for the enabled flag', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  expect(await InboxPage()).toEqual(createElement(QueueEntry));
});

import { createElement } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import InboxPage from '@/app/[locale]/(captain)/captain/inbox/page';
import { InboxScreen } from './index';
import { WorkspaceInbox } from './server';
vi.mock('./index', () => ({ InboxScreen: () => null, messages: {} }));
vi.mock('./server', () => ({ WorkspaceInbox: () => null }));
afterEach(() => vi.unstubAllEnvs());
it.each([undefined, '', '0', 'true'])('keeps the exact flag-off inbox tree for %s', async flag => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', flag);
  expect(await InboxPage()).toEqual(createElement(InboxScreen));
});
it('uses the v6 entry only for the enabled flag', async () => {
  vi.stubEnv('NEXT_PUBLIC_CAPTAIN_WORKSPACE', '1');
  expect(await InboxPage()).toEqual(createElement(WorkspaceInbox));
});

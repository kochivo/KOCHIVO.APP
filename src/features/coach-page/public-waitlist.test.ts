import { beforeEach, expect, it, vi } from 'vitest';
import type * as ReactModule from 'react';
import { PublicWaitlist } from './components/public-waitlist';
import { joinWaitlist } from './data/waitlist';
import { messages } from './sections/messages';
import { createT } from '@/core/i18n/messages';
const hooks = vi.hoisted(() => ({ status: null as unknown, task: undefined as Promise<void> | undefined }));
vi.mock('react', async original => ({ ...await original<typeof ReactModule>(),
  useState: () => [hooks.status, (status: unknown) => { hooks.status = status; }],
  useTransition: () => [false, (run: () => Promise<void>) => { hooks.task = run(); }],
}));
vi.mock('./data/waitlist', () => ({ joinWaitlist: vi.fn() }));
beforeEach(() => { hooks.status = null; hooks.task = undefined; vi.clearAllMocks(); });
const t = createT(messages, 'en');
const labels = { waitlist: t('waitlist'), waitlisted: t('waitlisted'), member: t('member'), failure: t('failure'), pending: t('pending') };
function render() { return PublicWaitlist({ slug: 'ali', labels }); }
async function tap() { render().props.children[0].props.onClick(); await hooks.task; }
it('navigates signed-out visitors to the returned signup URL', async () => {
  const assign = vi.fn(); vi.stubGlobal('window', { location: { assign } });
  vi.mocked(joinWaitlist).mockResolvedValue({ redirect: '/login?tab=signup&next=%2Fc%2Fali' });
  await tap(); expect(assign).toHaveBeenCalledWith('/login?tab=signup&next=%2Fc%2Fali');
  vi.unstubAllGlobals();
});
it('keeps repeat taps idempotent and displays membership and retry errors', async () => {
  vi.mocked(joinWaitlist).mockResolvedValue({ status: 'waitlisted' });
  await tap(); await tap();
  expect(render().props.children[1].props.children).toBe(messages.en.waitlisted);
  vi.mocked(joinWaitlist).mockResolvedValue({ status: 'member' });
  await tap(); expect(render().props.children[0].props.disabled).toBe(true);
  vi.mocked(joinWaitlist).mockRejectedValue(new Error('offline'));
  await tap(); expect(render().props.children[1].props.role).toBe('alert');
  expect(render().props.children[1].props.children).toBe(messages.en.failure);
});

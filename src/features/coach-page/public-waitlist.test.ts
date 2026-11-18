import { beforeEach, expect, it, vi } from 'vitest';
import type * as ReactModule from 'react';
import { PublicWaitlistProvider } from './components/public-waitlist-provider';
import { PublicWaitlist } from './components/public-waitlist';
import { joinWaitlist } from './data/waitlist';
import { messages } from './sections/messages';
import { createT } from '@/core/i18n/messages';
const hooks = vi.hoisted(() => ({ status: null as unknown, context: {} as unknown, pending: false, latch: { current: false }, task: undefined as Promise<void> | undefined }));
vi.mock('react', async original => ({ ...await original<typeof ReactModule>(),
  useContext: () => hooks.context,
  useRef: () => hooks.latch,
  useState: () => [hooks.status, (status: unknown) => { hooks.status = status; }],
  useTransition: () => [hooks.pending, (run: () => Promise<void>) => { hooks.task = run(); }],
}));
vi.mock('./data/waitlist', () => ({ joinWaitlist: vi.fn() }));
beforeEach(() => { hooks.status = null; hooks.task = undefined; hooks.pending = false; hooks.latch.current = false; vi.clearAllMocks(); });
const t = createT(messages, 'en');
const labels = { waitlist: t('waitlist'), waitlisted: t('waitlisted'), member: t('member'), failure: t('failure'), pending: t('pending') };
function render() {
  hooks.context = PublicWaitlistProvider({ slug: 'ali', children: null }).props.value;
  return PublicWaitlist({ labels });
}
async function tap() { render().props.children[0].props.onClick(); await hooks.task; }
it('navigates signed-out visitors to the returned signup URL', async () => {
  const assign = vi.fn(); vi.stubGlobal('window', { location: { assign } });
  vi.mocked(joinWaitlist).mockResolvedValue({ redirect: '/login?tab=signup&coach=ali' });
  await tap(); expect(assign).toHaveBeenCalledWith('/login?tab=signup&coach=ali');
  vi.unstubAllGlobals();
});
it('shares pending and success across placements and submits only once', async () => {
  vi.mocked(joinWaitlist).mockResolvedValue({ status: 'waitlisted' });
  const hero = render();
  const dock = PublicWaitlist({ labels });
  hero.props.children[0].props.onClick();
  dock.props.children[0].props.onClick();
  hooks.pending = true;
  expect(render().props.children[0].props.disabled).toBe(true);
  expect(PublicWaitlist({ labels }).props.children[0].props.disabled).toBe(true);
  await hooks.task;
  hooks.pending = false;
  expect(render().props.children[1].props.children).toBe(messages.en.waitlisted);
  const done = PublicWaitlist({ labels });
  expect(done.props.children[0].props.disabled).toBe(true);
  done.props.children[0].props.onClick();
  expect(joinWaitlist).toHaveBeenCalledOnce();
});

it('shows errors across placements and allows retry', async () => {
  vi.mocked(joinWaitlist).mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({ status: 'member' });
  await tap();
  expect(render().props.children[1].props.role).toBe('alert');
  expect(PublicWaitlist({ labels }).props.children[1].props.children).toBe(messages.en.failure);
  await tap();
  expect(render().props.children[0].props.disabled).toBe(true);
  expect(render().props.children[1].props.children).toBe(messages.en.member);
});

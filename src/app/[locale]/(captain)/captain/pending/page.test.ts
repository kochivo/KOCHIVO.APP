import { beforeEach, expect, it, vi } from 'vitest';
import CaptainPendingPage from './page';
import { PendingIntake } from '@/features/captain-approval';

const state = vi.hoisted(() => ({ approval: vi.fn(), redirect: vi.fn() }));
vi.mock('@/features/roster', () => ({ captainApproval: state.approval }));
vi.mock('@/features/captain-approval', () => ({ PendingIntake: () => null }));
vi.mock('next/navigation', () => ({ redirect: state.redirect }));
beforeEach(() => {
  state.approval.mockReset();
  state.redirect.mockReset().mockImplementation((href: string) => { throw new Error(href); });
});

it('redirects to Captain home when approval no longer requires the pending route', async () => {
  state.approval.mockResolvedValue(null);
  await expect(CaptainPendingPage()).rejects.toThrow('/captain');
  expect(state.redirect).toHaveBeenCalledWith('/captain');
});

it.each(['pending', 'rejected'])('renders intake for a %s captain', async status => {
  state.approval.mockResolvedValue(status);
  expect(await CaptainPendingPage()).toMatchObject({ type: PendingIntake, props: { status } });
  expect(state.redirect).not.toHaveBeenCalled();
});

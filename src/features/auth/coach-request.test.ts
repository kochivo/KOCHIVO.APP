import { beforeEach, expect, it, vi } from 'vitest';
import { completeCoachRequest } from './data/coach-request';
const mock = vi.hoisted(() => ({ profile: vi.fn(), rpc: vi.fn(), insert: vi.fn(), getUser: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/core/offline/ids', () => ({ uuidv7: () => '01900000-0000-7000-8000-000000000001' }));
vi.mock('./data/auth-client', () => ({ profile: mock.profile }));
const client = { rpc: mock.rpc, auth: { getUser: mock.getUser }, from: () => ({ insert: mock.insert }) };
beforeEach(() => {
  vi.clearAllMocks();
  mock.profile.mockResolvedValue({ role: 'player', roleConfirmed: false });
  mock.rpc.mockResolvedValue({ error: null });
  mock.getUser.mockResolvedValue({ data: { user: { id: 'player-id' } }, error: null });
  mock.insert.mockResolvedValue({ error: null });
});
it('confirms player intent and creates a pending request without redeeming an invite', async () => {
  mock.rpc.mockResolvedValueOnce({ error: null }).mockResolvedValueOnce({ data: [{ id: 'captain-id' }], error: null });
  const result = await completeCoachRequest(client as unknown as Parameters<typeof completeCoachRequest>[0], 'ahmed');
  expect(result).toBe('/c/ahmed?requested=1');
  expect(mock.rpc.mock.calls).toEqual([['confirm_role', { p_role: 'player' }], ['coach_public_profile', { slug: 'ahmed' }]]);
  expect(mock.insert).toHaveBeenCalledWith({ id: '01900000-0000-7000-8000-000000000001', captain_id: 'captain-id', player_id: 'player-id' });
});
it('never changes a captain account or writes a request for it', async () => {
  mock.profile.mockResolvedValue({ role: 'captain', roleConfirmed: true });
  await expect(completeCoachRequest(client as unknown as Parameters<typeof completeCoachRequest>[0], 'ahmed')).rejects.toThrow();
  expect(mock.insert).not.toHaveBeenCalled();
});
it.each(['captain', 'player'])('routes an admin %s home before creating a coach request', async role => {
  mock.profile.mockResolvedValue({ role, roleConfirmed: false, admin: true });
  expect(await completeCoachRequest(client as unknown as Parameters<typeof completeCoachRequest>[0], 'ahmed')).toBe('/admin');
  expect(mock.rpc).not.toHaveBeenCalled();
  expect(mock.insert).not.toHaveBeenCalled();
});
it('rejects invalid and missing coaches before creating a request', async () => {
  await expect(completeCoachRequest(client as unknown as Parameters<typeof completeCoachRequest>[0], 'admin')).rejects.toThrow();
  mock.rpc.mockResolvedValue({ data: [], error: null });
  await expect(completeCoachRequest(client as unknown as Parameters<typeof completeCoachRequest>[0], 'missing')).rejects.toThrow();
  expect(mock.insert).not.toHaveBeenCalled();
});

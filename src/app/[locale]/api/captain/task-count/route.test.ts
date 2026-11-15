import { beforeEach, expect, it, vi } from 'vitest';
import { GET } from './route';

const state = vi.hoisted(() => ({ load: vi.fn() }));
vi.mock('@/features/captain-workspace/server', () => ({ loadTasks: state.load }));
beforeEach(() => { state.load.mockReset(); });

it.each([0, 5])('returns the loaded count %s without caching', async count => {
  state.load.mockResolvedValue({ tasks: Array.from({ length: count }, (_, id) => ({ id })) });
  const response = await GET();
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ count });
  expect(response.headers.get('cache-control')).toBe('no-store');
});
it('returns 401 without logging an unauthenticated session', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    state.load.mockRejectedValue(new Error('Unauthenticated'));
    const response = await GET();
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ count: null });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(log).not.toHaveBeenCalled();
  } finally { log.mockRestore(); }
});
it('returns unknown and logs once on other failures', async () => {
  const log = vi.spyOn(console, 'error').mockImplementation(() => {});
  try {
    state.load.mockRejectedValue(new Error('Unavailable'));
    const response = await GET();
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ count: null });
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect(log).toHaveBeenCalledTimes(1);
  } finally { log.mockRestore(); }
});

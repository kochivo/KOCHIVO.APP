import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { sendFeedback } from './data/send-feedback';

type Sent = (event: { event_id?: string }, response: { statusCode?: number } | undefined) => void;
const mocks = vi.hoisted(() => ({ captureFeedback: vi.fn(), getSession: vi.fn(), dsn: 'configured',
  listener: undefined as Sent | undefined, status: 200, flush: vi.fn(), unsubscribe: vi.fn() }));
vi.mock('@sentry/nextjs', () => ({ captureFeedback: mocks.captureFeedback, flush: mocks.flush,
  getClient: () => ({ on: (_name: string, listener: Sent) => { mocks.listener = listener; return mocks.unsubscribe; } }),
}));
vi.mock('@/lib/public-config', () => ({ publicConfig: { get sentryDsn() { return mocks.dsn; } } }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({ auth: { getSession: mocks.getSession } }) }));
beforeEach(() => {
  vi.clearAllMocks(); mocks.dsn = 'configured';
  mocks.captureFeedback.mockReturnValue('event-id');
  mocks.status = 200;
  mocks.flush.mockImplementation(async () => {
    mocks.listener?.({ event_id: 'unrelated-event' }, { statusCode: 500 });
    mocks.listener?.({ event_id: 'event-id' }, { statusCode: mocks.status });
    return true;
  });
  mocks.getSession.mockResolvedValue({ data: { session: { user: { id: 'user-id', email: 'private@example.com' } } }, error: null });
  vi.stubGlobal('location', { href: 'https://kochivo.site/en/captain?tab=players' });
});
afterEach(() => vi.unstubAllGlobals());

it.each(['', '    ', 'four', 'x'.repeat(1001)])('rejects invalid feedback', async message => {
  expect(await sendFeedback(message, 'captain')).toEqual({ error: 'validation' });
  expect(mocks.captureFeedback).not.toHaveBeenCalled();
});
it.each(['captain', 'player'] as const)('sends feedback with URL, %s role and id only', async role => {
  expect(await sendFeedback('  A broken button  ', role)).toEqual({});
  expect(mocks.captureFeedback).toHaveBeenCalledWith({ message: 'A broken button', url: location.href },
    { captureContext: { tags: { role }, user: { id: 'user-id' } } });
});
it.each([5, 1000])('accepts the %s character boundary', async length => {
  expect(await sendFeedback('x'.repeat(length), 'player')).toEqual({});
});
it('returns a sending error without a DSN', async () => {
  mocks.dsn = '';
  expect(await sendFeedback('Broken button', 'captain')).toEqual({ error: 'failed' });
  expect(mocks.captureFeedback).not.toHaveBeenCalled();
});
it('returns an error when transport rejects or identity is missing', async () => {
  mocks.captureFeedback.mockImplementationOnce(() => { throw new Error('offline'); });
  expect(await sendFeedback('Broken button', 'player')).toEqual({ error: 'failed' });
  mocks.getSession.mockResolvedValueOnce({ data: { session: null }, error: null });
  expect(await sendFeedback('Broken button', 'player')).toEqual({ error: 'failed' });
});
it.each([0, 400, 429, 500])('reports a sending error for HTTP status %s', async status => {
  mocks.status = status;
  expect(await sendFeedback('Broken button', 'captain')).toEqual({ error: 'failed' });
  expect(mocks.unsubscribe).toHaveBeenCalledOnce();
});
it('reports a sending error when flushing times out or the event is dropped', async () => {
  mocks.flush.mockResolvedValueOnce(false);
  expect(await sendFeedback('Broken button', 'player')).toEqual({ error: 'failed' });
  mocks.flush.mockResolvedValueOnce(true);
  expect(await sendFeedback('Broken button', 'player')).toEqual({ error: 'failed' });
});

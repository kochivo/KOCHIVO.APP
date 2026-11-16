import { expect, it, vi } from 'vitest';
import { reportPushFailure } from './report';

it('sends one minimal event envelope to the DSN project', async () => {
  const send = vi.fn<typeof fetch>().mockResolvedValue(new Response(null, { status: 200 }));
  const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(new AbortController().signal);
  try {
    await reportPushFailure('https://abc@o1.ingest.sentry.io/2', 'delivery_failed', 3, send);
    expect(send).toHaveBeenCalledOnce();
    const [url, init] = send.mock.calls[0] ?? [];
    expect(url).toBe('https://o1.ingest.sentry.io/api/2/envelope/?sentry_key=abc');
    expect(init?.method).toBe('POST');
    expect(init?.headers).toEqual({ 'Content-Type': 'application/x-sentry-envelope' });
    expect(String(init?.body).trim().split('\n').map(line => JSON.parse(line))).toEqual([
      {}, { type: 'event' }, { level: 'error', message: 'Push send failed',
        tags: { area: 'push', reason: 'delivery_failed' }, extra: { count: 3 } },
    ]);
    expect(timeout).toHaveBeenCalledWith(3000);
  } finally { timeout.mockRestore(); }
});

it('returns quietly on fetch rejection', async () => {
  const timeout = vi.spyOn(AbortSignal, 'timeout').mockReturnValue(new AbortController().signal);
  try {
    const send = vi.fn<typeof fetch>().mockRejectedValue(new Error('private provider response'));
    await expect(reportPushFailure('https://abc@o1.ingest.sentry.io/2', 'request_failed', undefined, send))
      .resolves.toBeUndefined();
    expect(send).toHaveBeenCalledOnce();
  } finally { timeout.mockRestore(); }
});

it.each([undefined, '', 'invalid', 'http://abc@o1.ingest.sentry.io/2'])('sends nothing with missing or invalid DSN %s', async dsn => {
  const send = vi.fn<typeof fetch>();
  await expect(reportPushFailure(dsn, 'request_failed', undefined, send)).resolves.toBeUndefined();
  expect(send).not.toHaveBeenCalled();
});

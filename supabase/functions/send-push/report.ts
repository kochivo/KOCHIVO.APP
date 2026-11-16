export async function reportPushFailure(dsn: string | undefined, reason: 'request_failed' | 'delivery_failed',
  count?: number, send: typeof fetch = fetch): Promise<void> {
  if (!dsn) return;
  try {
    const parsed = new URL(dsn);
    const parts = parsed.pathname.split('/').filter(Boolean);
    const project = parts.pop();
    if (parsed.protocol !== 'https:' || !parsed.username || !project) return;
    const endpoint = new URL(`${parts.length ? `/${parts.join('/')}` : ''}/api/${project}/envelope/`, parsed.origin);
    endpoint.searchParams.set('sentry_key', parsed.username);
    const event = JSON.stringify({ level: 'error', message: 'Push send failed', tags: { area: 'push', reason },
      ...(count === undefined ? {} : { extra: { count } }) });
    await send(endpoint.toString(), { method: 'POST', headers: { 'Content-Type': 'application/x-sentry-envelope' },
      body: `{}\n${JSON.stringify({ type: 'event' })}\n${event}\n`, signal: AbortSignal.timeout(3000) });
  } catch { /* Reporting must never affect push delivery or its response. */ }
}

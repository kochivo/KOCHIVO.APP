import { afterEach, describe, expect, it, vi } from 'vitest';
import { beforeBreadcrumb, beforeSend } from './sentry-scrub';

vi.mock('@sentry/nextjs', () => ({ init: vi.fn() }));

afterEach(() => { vi.unstubAllEnvs(); vi.resetModules(); vi.clearAllMocks(); });

describe('Sentry privacy', () => {
  it('removes users and request payloads without mutating the event', () => {
    const event = { user: { id: 'private', email: 'a@example.com', ip_address: '127.0.0.1' },
      request: { url: 'https://app.test/workout?token=secret#private', data: 'body',
        cookies: { session: 'secret' }, headers: { authorization: 'secret' }, query_string: 'secret' } };
    expect(beforeSend(event)).toEqual({ request: { url: 'https://app.test/workout' } });
    expect(event.user.id).toBe('private');
    expect(event.request.data).toBe('body');
  });

  it('keeps stack-frame locations so crashes stay traceable', () => {
    const frame = { filename: 'app:///_next/static/chunks/page.js', abs_path: 'app:///page.js',
      function: 'renderFocus', module: 'focus-screen', lineno: 12 };
    const event = { exception: { values: [{ type: 'Error', value: 'boom', stacktrace: { frames: [frame] } }] } };
    expect(beforeSend(event)).toEqual(event);
  });

  it.each(['email', 'phone', 'password', 'token', 'weight', 'kg', 'waist', 'photo',
    'video', 'path', 'note', 'reply', 'full_name', 'name', 'intake', 'injuries', 'medical', 'allergies'])
  ('redacts nested %s keys including variants', (key) => {
    expect(beforeSend({ extra: { nested: [{ [`player_${key}`]: 'private', safe: 42 }] } }))
      .toEqual({ extra: { nested: [{ [`player_${key}`]: '[Redacted]', safe: 42 }] } });
  });

  it.each(['a.person@example.com', '+20 100 123 4567', '01001234567', '(202) 555-0123'])
  ('redacts contact strings in messages, exceptions and breadcrumbs: %s', (contact) => {
    const message = `Failed for ${contact}`;
    const result = beforeSend({ message, exception: { values: [{ value: message }] },
      breadcrumbs: [{ message }] });
    expect(JSON.stringify(result)).not.toContain(contact);
    expect(beforeBreadcrumb({ message })).toEqual({ message: 'Failed for [Redacted]' });
  });

  it.each(['fetch', 'xhr', 'http'])('drops private %s URLs', (category) => {
    for (const url of ['https://app.test/storage/v1/object/private', '/api?secret=value']) {
      expect(beforeBreadcrumb({ category, data: { url } })).toBeNull();
      expect(beforeSend({ breadcrumbs: [{ category, data: { url } }] }).breadcrumbs).toEqual([]);
    }
    expect(beforeBreadcrumb({ category, data: { url: '/api' } })).not.toBeNull();
  });

  it('scrubs navigation URLs and nested request information', () => {
    expect(beforeBreadcrumb({ category: 'navigation', data: {
      from: 'https://app.test/?secret=value', headers: { secret: 'value' }, weightKg: 90,
    } })).toEqual({ category: 'navigation', data: { from: 'https://app.test/', weightKg: '[Redacted]' } });
  });
});

describe('Sentry without a DSN', () => {
  it.each([undefined, '', '   '])('never initializes any runtime for %s', async (dsn) => {
    vi.stubEnv('NEXT_PUBLIC_SENTRY_DSN', dsn);
    const sentry = await import('@sentry/nextjs');
    await import('../instrumentation-client');
    await import('../../sentry.server.config');
    await import('../../sentry.edge.config');
    const { register } = await import('../instrumentation');
    for (const runtime of ['nodejs', 'edge']) {
      vi.stubEnv('NEXT_RUNTIME', runtime);
      await register();
    }
    expect(sentry.init).not.toHaveBeenCalled();
  });
});

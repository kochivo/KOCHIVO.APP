import { readFileSync } from 'node:fs';
import { timingSafeEqual, webcrypto } from 'node:crypto';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { expect, it } from 'vitest';
import { pushPayload } from './payload';

const id = '00000000-0000-4000-8000-000000000001';
const source = ts.transpileModule(readFileSync('supabase/functions/send-push/index.ts', 'utf8'), {
  compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 },
}).outputText;

function sender(status?: number, configured = true, feedback = false) {
  const requests: { path: string; method: string; body?: string }[] = [];
  const sent: { endpoint: string; payload: string }[] = [];
  const errors: unknown[][] = [];
  let handler: ((request: Request) => Promise<Response>) | undefined;
  const config = configured ? { push_hook_secret: 'hook-secret', vapid_public_key: 'public',
    vapid_private_key: 'private', vapid_subject: 'mailto:test@example.com' } : null;
  class FixedDate extends Date { constructor() { super('2026-11-04T10:00:00Z'); } }
  runInNewContext(source, {
    exports: {}, Date: FixedDate, TextEncoder, crypto: webcrypto, Response,
    console: { error: (...args: unknown[]) => errors.push(args) },
    require: (name: string) => {
      if (name === 'node:crypto') return { timingSafeEqual };
      if (name === './payload.ts') return { pushPayload };
      if (name === 'npm:web-push@3.6.7') return { sendNotification: async (subscription: { endpoint: string }, payload: string) => {
        sent.push({ endpoint: subscription.endpoint, payload });
        if (status) throw { statusCode: status, endpoint: subscription.endpoint, body: 'private provider response' };
      } };
      throw new Error(`Unexpected import ${name}`);
    },
    Deno: { serve: (callback: typeof handler) => { handler = callback; }, env: { get: (key: string) => {
      if (key === 'SUPABASE_URL') return 'https://db.example';
      if (key === 'SUPABASE_SERVICE_ROLE_KEY') return 'service-key';
      throw new Error('Unexpected environment variable');
    } } },
    fetch: async (url: string, init: RequestInit) => {
      const path = url.replace('https://db.example/rest/v1/', '');
      requests.push({ path, method: init.method ?? 'GET', body: init.body as string | undefined });
      if (path === 'rpc/push_config') return Response.json(config);
      if (path.startsWith('notifications?')) return Response.json([
        feedback ? { id, user_id: id, type: 'workout_feedback', payload: { session_id: id, rpe: 9, has_note: true } }
          : { id, user_id: id, type: 'workout_reminder', payload: { day_title: 'Legs' } },
      ]);
      if (path.startsWith('workout_sessions?')) return Response.json([{ player_id: id }]);
      if (path.startsWith('push_subscriptions?user_id=')) return Response.json([
        { id, endpoint: 'https://push.example/private-endpoint', p256dh: 'key', auth: 'auth' },
      ]);
      if (path === `push_subscriptions?id=eq.${id}`) return new Response(null, { status: 204 });
      throw new Error('Unexpected data request');
    },
  });
  if (!handler) throw new Error('Sender did not register');
  return { handle: handler, requests, sent, errors };
}
const request = (secret = 'hook-secret', notificationId = id) => new Request('https://functions.example/send-push', {
  method: 'POST', headers: { 'x-push-secret': secret }, body: JSON.stringify({ notification_id: notificationId }),
});

it('resolves feedback to a player URL without fetching the note', async () => {
  const test = sender(undefined, true, true);
  expect((await test.handle(request())).status).toBe(204);
  expect(JSON.parse(test.sent[0]?.payload ?? '{}').url).toBe(`/ar/captain/players/${id}`);
  expect(test.requests.find(row => row.path.startsWith('workout_sessions?'))?.path)
    .toBe(`workout_sessions?id=eq.${id}&select=player_id&limit=1`);
});

it('rejects missing, wrong and unconfigured secrets before reading user data', async () => {
  for (const secret of ['', 'wrong', 'hook-secret-extra']) {
    const test = sender();
    expect((await test.handle(request(secret))).status).toBe(401);
    expect(test.requests.every(row => row.path === 'rpc/push_config')).toBe(true);
    expect(test.sent).toEqual([]);
  }
  expect((await sender(undefined, false).handle(request())).status).toBe(401);
});
it('rejects non-POST requests and malformed notification ids', async () => {
  const test = sender();
  expect((await test.handle(new Request('https://functions.example/send-push'))).status).toBe(405);
  expect((await test.handle(request('hook-secret', 'bad&filter=value'))).status).toBe(400);
  expect(test.sent).toEqual([]);
});
it('delivers default Arabic payloads and records successful delivery', async () => {
  const test = sender();
  expect((await test.handle(request())).status).toBe(204);
  expect(test.sent).toHaveLength(1);
  expect(JSON.parse(test.sent[0]?.payload ?? '{}')).toEqual({
    title: 'إشعارات كوتشيفو', body: 'جاهز لتمرين النهارده؟ Legs مستنيك', url: '/ar/player', tag: id,
  });
  expect(test.requests.at(-1)).toEqual({ path: `push_subscriptions?id=eq.${id}`, method: 'PATCH',
    body: '{"last_success_at":"2026-11-04T10:00:00.000Z"}' });
  expect(test.errors).toEqual([]);
});
it.each([404, 410])('removes dead endpoints for status %s', async status => {
  const test = sender(status);
  expect((await test.handle(request())).status).toBe(204);
  expect(test.requests.at(-1)?.method).toBe('DELETE');
  expect(test.errors).toEqual([]);
});
it('retains endpoints on transient failures and logs no user or provider data', async () => {
  const test = sender(503);
  expect((await test.handle(request())).status).toBe(204);
  expect(test.requests.some(row => row.method === 'DELETE')).toBe(false);
  expect(test.errors).toEqual([['Push delivery failed']]);
});

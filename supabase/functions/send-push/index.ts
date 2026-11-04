import webpush from 'npm:web-push@3.6.7';
import { timingSafeEqual } from 'node:crypto';
import { pushPayload } from './payload.ts';
import type { PushNotificationRow } from './payload.ts';

interface SubscriptionRow { id: string; endpoint: string; p256dh: string; auth: string }
interface PushConfig {
  push_hook_secret: string;
  vapid_public_key: string;
  vapid_private_key: string;
  vapid_subject: string;
}

async function sameSecret(actual: string, expected: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const [a, b] = await Promise.all([actual, expected].map(value => crypto.subtle.digest('SHA-256', encoder.encode(value))));
  return timingSafeEqual(new Uint8Array(a), new Uint8Array(b));
}

Deno.serve(async request => {
  if (request.method !== 'POST') return new Response(null, { status: 405 });
  const suppliedSecret = request.headers.get('x-push-secret');
  if (!suppliedSecret) return new Response(null, { status: 401 });
  try {
    const base = Deno.env.get('SUPABASE_URL');
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    if (!base || !key) throw new Error('Missing runtime config');
    const rest = async (path: string, init?: RequestInit) => {
      const response = await fetch(`${base}/rest/v1/${path}`, { ...init, headers: {
        apikey: key, Authorization: `Bearer ${key}`, 'Content-Type': 'application/json', ...init?.headers,
      } });
      if (!response.ok) throw new Error('Push data request failed');
      return response;
    };
    const config: PushConfig | null = await (await rest('rpc/push_config', { method: 'POST', body: '{}' })).json();
    if (!config?.push_hook_secret || !await sameSecret(suppliedSecret, config.push_hook_secret)) {
      return new Response(null, { status: 401 });
    }
    if (!config.vapid_public_key || !config.vapid_private_key || !config.vapid_subject) {
      throw new Error('Missing push config');
    }
    let input: unknown;
    try { input = await request.json(); } catch { return new Response(null, { status: 400 }); }
    const id = input && typeof input === 'object' && 'notification_id' in input ? input.notification_id : null;
    if (typeof id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
      return new Response(null, { status: 400 });
    }
    const rows: (PushNotificationRow & { user_id: string })[] = await (await rest(
      `notifications?id=eq.${id}&select=id,user_id,type,payload&limit=1`,
    )).json();
    const notification = rows[0];
    if (!notification) return new Response(null, { status: 204 });
    if (notification.type === 'workout_feedback') {
      const data = notification.payload;
      const sessionId = data && typeof data === 'object' && 'session_id' in data ? data.session_id : null;
      if (typeof sessionId !== 'string') return new Response(null, { status: 400 });
      const sessions: { player_id: string }[] = await (await rest(
        `workout_sessions?id=eq.${encodeURIComponent(sessionId)}&select=player_id&limit=1`,
      )).json();
      notification.player_id = sessions[0]?.player_id;
    }
    const subscriptions: SubscriptionRow[] = await (await rest(
      `push_subscriptions?user_id=eq.${encodeURIComponent(notification.user_id)}&select=id,endpoint,p256dh,auth`,
    )).json();
    const payload = JSON.stringify(pushPayload(notification));
    await Promise.all(subscriptions.map(async subscription => {
      try {
        await webpush.sendNotification({ endpoint: subscription.endpoint,
          keys: { p256dh: subscription.p256dh, auth: subscription.auth } }, payload, {
          vapidDetails: { subject: config.vapid_subject, publicKey: config.vapid_public_key, privateKey: config.vapid_private_key },
          TTL: 86400,
        });
        await rest(`push_subscriptions?id=eq.${subscription.id}`, {
          method: 'PATCH', body: JSON.stringify({ last_success_at: new Date().toISOString() }),
        });
      } catch (error) {
        const status = error && typeof error === 'object' && 'statusCode' in error ? error.statusCode : null;
        if (status === 404 || status === 410) {
          try { await rest(`push_subscriptions?id=eq.${subscription.id}`, { method: 'DELETE' }); }
          catch { console.error('Push subscription cleanup failed'); }
        } else console.error('Push delivery failed');
      }
    }));
    return new Response(null, { status: 204 });
  } catch {
    console.error('Push request failed');
    return new Response(null, { status: 500 });
  }
});

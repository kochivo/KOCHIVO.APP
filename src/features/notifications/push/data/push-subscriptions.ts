import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { uuidv7 } from '@/core/offline/ids';
import { base64UrlBytes } from '../push-support';
import { allowedPushEndpoint } from '@/lib/push-endpoint';

async function storedSubscription(endpoint: string) {
  const client = await loadSupabaseBrowser();
  const { data, error } = await client.from('push_subscriptions').select('id').eq('endpoint', endpoint).maybeSingle();
  if (error) throw error;
  return data;
}

export async function currentPushState(): Promise<boolean> {
  const registration = await readyWorker();
  const subscription = await registration.pushManager.getSubscription();
  return subscription ? Boolean(await storedSubscription(subscription.endpoint)) : false;
}

async function readyWorker(): Promise<ServiceWorkerRegistration> {
  // Android can open settings before the first worker registered or activated; ready never rejects, so bound the wait.
  const registration = await navigator.serviceWorker.getRegistration()
    ?? await navigator.serviceWorker.register?.('/sw.js', { scope: '/' }).catch(() => undefined);
  if (!registration) throw new Error('Service worker unavailable');
  if (registration.active) return navigator.serviceWorker.ready;
  return Promise.race([navigator.serviceWorker.ready, new Promise<never>((_, reject) =>
    setTimeout(() => reject(new Error('Service worker unavailable')), 10_000))]);
}

function sameKey(subscription: PushSubscription, key: Uint8Array): boolean {
  const current = subscription.options?.applicationServerKey;
  if (!current) return true;
  const bytes = new Uint8Array(current);
  return bytes.length === key.length && bytes.every((byte, index) => byte === key[index]);
}

async function storeSubscription(subscription: PushSubscription) {
  if (!allowedPushEndpoint(subscription.endpoint)) throw new Error('Invalid push endpoint');
  if (await storedSubscription(subscription.endpoint)) return;
  const serialized = subscription.toJSON();
  const p256dh = serialized.keys?.p256dh;
  const auth = serialized.keys?.auth;
  if (!p256dh || !auth) throw new Error('Invalid push subscription');
  const client = await loadSupabaseBrowser();
  const { error } = await client.from('push_subscriptions').insert({
    id: uuidv7(), endpoint: subscription.endpoint, p256dh, auth, user_agent: navigator.userAgent.slice(0, 300),
  });
  if (error && (error.code !== '23505' || !await storedSubscription(subscription.endpoint))) throw error;
}

export async function subscribePush(publicKey: string): Promise<'on' | 'denied'> {
  // Request immediately from the click, before awaiting service worker or network work (iOS).
  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return 'denied';
  const registration = await readyWorker();
  const key = base64UrlBytes(publicKey);
  let existing = await registration.pushManager.getSubscription();
  // Chrome rejects subscribe() while an endpoint made with another server key is still attached.
  if (existing && !sameKey(existing, key)) { await existing.unsubscribe(); existing = null; }
  const options = { userVisibleOnly: true, applicationServerKey: key };
  // Safari's push service can drop the first request right after an unsubscribe ("Load failed").
  const create = () => registration.pushManager.subscribe(options)
    .catch((error: unknown) => {
      if (!(error instanceof TypeError)) throw error;
      return registration.pushManager.subscribe(options);
    });
  let subscription = existing ?? await create();
  let created = !existing;
  try {
    try { await storeSubscription(subscription); } catch (error) {
      if (!existing || !error || typeof error !== 'object' || !('code' in error) || error.code !== '23505') throw error;
      // RLS hides a previous account's row. Rotate rather than transferring its endpoint.
      await subscription.unsubscribe();
      subscription = await create(); created = true;
      await storeSubscription(subscription);
    }
    return 'on';
  } catch (error) {
    if (created) await subscription.unsubscribe();
    throw error;
  }
}

export async function unsubscribePush(): Promise<void> {
  const registration = await readyWorker();
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription) return;
  const client = await loadSupabaseBrowser();
  const { error } = await client.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint);
  if (error) throw error;
  // Deleting the server row first stops delivery even if the browser cannot release its endpoint.
  await subscription.unsubscribe();
}

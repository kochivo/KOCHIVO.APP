import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { uuidv7 } from '@/core/offline/ids';
import { base64UrlBytes } from '../push-support';

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

async function readyWorker() {
  // ready never rejects, so fail explicitly when registration/activation has not succeeded.
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration?.active) throw new Error('Service worker unavailable');
  return navigator.serviceWorker.ready;
}

async function storeSubscription(subscription: PushSubscription) {
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
  const existing = await registration.pushManager.getSubscription();
  const create = () => registration.pushManager.subscribe({
    userVisibleOnly: true, applicationServerKey: base64UrlBytes(publicKey),
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

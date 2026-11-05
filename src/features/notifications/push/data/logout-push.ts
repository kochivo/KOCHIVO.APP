import { loadSupabaseBrowser } from '@/core/supabase/lazy';

export async function unsubscribeDevicePush(signal: AbortSignal): Promise<void> {
  if (!('serviceWorker' in navigator)) return;
  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration || signal.aborted) return;
  const subscription = await registration.pushManager.getSubscription();
  if (!subscription || signal.aborted) return;
  // Release the browser endpoint even when offline; an old account cannot deliver to it.
  const released = subscription.unsubscribe().catch(() => false);
  try {
    const client = await loadSupabaseBrowser();
    if (signal.aborted) return;
    await client.from('push_subscriptions').delete().eq('endpoint', subscription.endpoint).abortSignal(signal);
  } finally { await released; }
}

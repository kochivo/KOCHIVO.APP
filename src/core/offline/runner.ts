import type { KochivoDB } from './db';
import { supabaseBrowser } from '@/core/supabase/browser';
import { flushMediaQueue, mediaPending, supabaseMediaTransport } from './media-queue';
import { flushOutbox, type SyncTransport } from './sync';

const INTERVAL_MS = 30_000;

/**
 * Background sync loop: flushes on start, when the device comes back online, when the app
 * returns to the foreground, and every 30s. Single-flight: overlapping triggers are skipped.
 * Returns a stop function (call it on sign-out).
 */
export function startSync(db: KochivoDB, send: SyncTransport): () => void {
  let running = false;
  let mediaRunning = false;
  let stopped = false;

  const runMedia = async () => {
    if (mediaRunning || stopped || !navigator.onLine) return;
    mediaRunning = true;
    try {
      if (await mediaPending(db) === 0) return;
      const client = supabaseBrowser();
      const { data, error } = await client.auth.getUser();
      if (!stopped && !error && data.user) {
        await flushMediaQueue(db, supabaseMediaTransport(client, data.user.id));
      }
    } catch {
      console.error('Media sync failed');
    } finally {
      mediaRunning = false;
    }
  };

  const run = async () => {
    if (running || stopped || !navigator.onLine) return;
    running = true;
    try {
      await flushOutbox(db, send);
    } catch (error) {
      console.error('Sync run failed', error);
    } finally {
      running = false;
      // A slow upload must not hold the next outbox flush behind the media queue.
      void runMedia();
    }
  };

  const onVisible = () => {
    if (document.visibilityState === 'visible') void run();
  };

  window.addEventListener('online', run);
  document.addEventListener('visibilitychange', onVisible);
  const timer = window.setInterval(run, INTERVAL_MS);
  void run();

  return () => {
    stopped = true;
    window.removeEventListener('online', run);
    document.removeEventListener('visibilitychange', onVisible);
    window.clearInterval(timer);
  };
}

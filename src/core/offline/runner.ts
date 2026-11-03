import type { KochivoDB } from './db';
import { flushOutbox, type SyncTransport } from './sync';

const INTERVAL_MS = 30_000;

/**
 * Background sync loop: flushes on start, when the device comes back online, when the app
 * returns to the foreground, and every 30s. Single-flight: overlapping triggers are skipped.
 * Returns a stop function (call it on sign-out).
 */
export function startSync(db: KochivoDB, send: SyncTransport): () => void {
  let running = false;

  const run = async () => {
    if (running || !navigator.onLine) return;
    running = true;
    try {
      await flushOutbox(db, send);
    } catch (error) {
      console.error('Sync run failed', error);
    } finally {
      running = false;
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
    window.removeEventListener('online', run);
    document.removeEventListener('visibilitychange', onVisible);
    window.clearInterval(timer);
  };
}

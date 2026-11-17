import { validateForm } from '../model';
import type { FormDraft } from '../types';
import { AUTOSAVE_DELAY_MS } from '@/lib/autosave-delay';

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'saveError';
export function createAutosave(save: (form: FormDraft) => Promise<void>, status: (status: SaveStatus) => void,
  schedule: (fn: () => void) => () => void = fn => {
    const timer = setTimeout(fn, AUTOSAVE_DELAY_MS); return () => clearTimeout(timer);
  }, onError?: (error: unknown) => void) {
  let latest: FormDraft | undefined, version = 0, running = false, ready = false, disposed = false;
  let cancel: (() => void) | undefined, savedVersion = 0;
  async function flush() {
    if (running || !ready || !latest || validateForm(latest).length) return;
    const form = latest, revision = version;
    running = true; ready = false; status('saving');
    try {
      await save(form);
      savedVersion = revision;
      if (!disposed) status(!latest || version === revision ? 'saved' : 'pending');
    } catch (error) {
      if (!disposed) { status(latest ? 'saveError' : 'saved'); if (latest) onError?.(error); }
    } finally {
      running = false;
      if (ready) void flush();
    }
  }
  return {
    update(form: FormDraft) {
      latest = form; version++; ready = false; cancel?.(); status('pending');
      cancel = schedule(() => { ready = true; void flush(); });
    },
    retry() { if (version === savedVersion) return; cancel?.(); ready = true; void flush(); },
    reset() { cancel?.(); latest = undefined; version++; ready = false; status('saved'); },
    dispose() { cancel?.(); ready = version !== savedVersion; void flush(); disposed = true; },
  };
}

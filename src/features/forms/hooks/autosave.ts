import { validateForm } from '../model';
import type { FormDraft } from '../types';

export type SaveStatus = 'saved' | 'pending' | 'saving' | 'saveError';
export function createAutosave(save: (form: FormDraft) => Promise<void>, status: (status: SaveStatus) => void,
  schedule: (fn: () => void) => () => void = fn => {
    const timer = setTimeout(fn, 700); return () => clearTimeout(timer);
  }) {
  let latest: FormDraft | undefined, version = 0, running = false, ready = false, disposed = false;
  let cancel: (() => void) | undefined;
  async function flush() {
    if (running || !ready || !latest || disposed || validateForm(latest).length) return;
    const form = latest, revision = version;
    running = true; ready = false; status('saving');
    try {
      await save(form);
      if (!disposed) status(!latest || version === revision ? 'saved' : 'pending');
    } catch {
      if (!disposed) status(latest ? 'saveError' : 'saved');
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
    retry() { ready = true; void flush(); },
    reset() { cancel?.(); latest = undefined; version++; ready = false; status('saved'); },
    dispose() { disposed = true; cancel?.(); },
  };
}

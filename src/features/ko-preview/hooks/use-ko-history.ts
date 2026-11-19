import { useEffect, useRef, useState } from 'react';
import type { AccountReply } from '@/features/ko-core';
import type { ActionState, ChatAction } from './use-ko-actions';

const retention = 7 * 86_400_000;
export const koHistoryLimit = 40;
const keyFor = (userId: string) => `kochivo.ko.chat.${userId}`;
type FinalState = { kind: 'done'; text: string } | { kind: 'failed'; text: string } | { kind: 'cancelled' } | { kind: 'expired' };
type SavedEntry = { speaker: 'user' | 'ko'; text: string; contextText?: string; timestamp: number;
  actions?: { title: string; state: FinalState }[] };

// Hand-written checks keep zod (about 90 KiB) out of the KO client bundle.
const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
function readState(value: unknown): FinalState | null {
  if (!isRecord(value)) return null;
  if (typeof value.text === 'string' && value.kind === 'done') return { kind: 'done', text: value.text };
  if (typeof value.text === 'string' && value.kind === 'failed') return { kind: 'failed', text: value.text };
  if (value.kind === 'cancelled') return { kind: 'cancelled' };
  return value.kind === 'expired' ? { kind: 'expired' } : null;
}
function readEntry(value: unknown): SavedEntry | null {
  if (!isRecord(value) || (value.speaker !== 'user' && value.speaker !== 'ko') || typeof value.text !== 'string'
    || typeof value.timestamp !== 'number' || (value.contextText !== undefined && typeof value.contextText !== 'string')) return null;
  if (value.actions !== undefined && !Array.isArray(value.actions)) return null;
  const actions: SavedEntry['actions'] = [];
  for (const item of Array.isArray(value.actions) ? value.actions : []) {
    const state = isRecord(item) && typeof item.title === 'string' ? readState(item.state) : null;
    if (!state || !isRecord(item) || typeof item.title !== 'string') return null;
    actions.push({ title: item.title, state });
  }
  return { speaker: value.speaker, text: value.text, timestamp: value.timestamp,
    ...(typeof value.contextText === 'string' && { contextText: value.contextText }),
    ...(Array.isArray(value.actions) && { actions }) };
}
type Extras = Pick<Extract<AccountReply, { kind: 'message' }>, 'quick' | 'upgrade'>;
export type Entry = Omit<SavedEntry, 'actions'> & Extras & {
  actions?: (ChatAction & { restoredState?: FinalState })[];
};

export function loadKoHistory(userId: string, now: number): Entry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw: unknown = JSON.parse(window.localStorage.getItem(keyFor(userId)) ?? '[]');
    if (!Array.isArray(raw)) return [];
    return raw.slice(-koHistoryLimit).flatMap((value: unknown, index) => {
      const parsed = readEntry(value);
      if (!parsed || parsed.timestamp < now - retention) return [];
      const { actions, ...entry } = parsed;
      return [{ ...entry, actions: actions?.map(({ title, state }, position) => ({
        id: `restored-${index}-${position}`, title, detail: '', restoredState: state,
        approval: { expiresAt: 0, expired: () => true, take: () => null },
      })) }];
    });
  } catch { return []; }
}

export function saveKoHistory(userId: string, entries: Entry[], states: Record<string, ActionState>, requireExisting = false) {
  try {
    const storage = window.localStorage;
    const key = keyFor(userId);
    if (!entries.length) {
      storage.removeItem(key);
      return false;
    }
    // A different tab may have removed the chat before its storage event arrives.
    if (requireExisting && storage.getItem(key) === null) return false;
    const saved = entries.slice(-koHistoryLimit).map(({ speaker, text, contextText, timestamp, actions }) => ({
      speaker, text, contextText, timestamp,
      actions: actions?.map(({ id, title, restoredState }) => {
        const state = restoredState ?? states[id];
        return { title, state: state?.kind === 'done' || state?.kind === 'failed' ? { kind: state.kind, text: state.text }
          : { kind: state?.kind === 'cancelled' ? 'cancelled' : 'expired' } };
      }),
    }));
    storage.setItem(key, JSON.stringify(saved));
    return true;
  } catch { return false; }
}

export function useKoHistory(userId: string | undefined, states: Record<string, ActionState>, onClear: () => void, now = Date.now) {
  const [history, setHistory] = useState<Entry[]>(() => userId ? loadKoHistory(userId, now()) : []);
  const saved = useRef(history.length > 0);
  useEffect(() => {
    if (userId && history.length && saveKoHistory(userId, history, states, saved.current)) saved.current = true;
  }, [userId, history, states]);

  useEffect(() => {
    if (!userId) return;
    const onStorage = (event: StorageEvent) => {
      if (event.newValue !== null || (event.key !== keyFor(userId) && event.key !== null)) return;
      saved.current = false;
      setHistory([]);
      onClear();
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [userId, onClear]);

  function clearHistory() {
    if (userId) saveKoHistory(userId, [], states);
    saved.current = false;
    setHistory([]);
    onClear();
  }

  return { history, setHistory, clearHistory };
}

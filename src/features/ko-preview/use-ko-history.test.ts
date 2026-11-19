import { afterEach, expect, it, vi } from 'vitest';
import { createApproval } from './approval';
import { loadKoHistory, saveKoHistory } from './hooks/use-ko-history';
import type { Entry } from './hooks/use-ko-history';

const now = 10 * 86_400_000;
afterEach(() => vi.unstubAllGlobals());

function storage() {
  const values = new Map<string, string>();
  const setItem = vi.fn((key: string, value: string) => values.set(key, value));
  vi.stubGlobal('window', { localStorage: { setItem, getItem: (key: string) => values.get(key) ?? null } });
  return { values, setItem };
}

it('round-trips text and final card states per user without tokens', () => {
  const { values } = storage();
  const entry: Entry = { speaker: 'ko', text: 'Reply', contextText: 'Context', timestamp: now,
    actions: ['done', 'cancelled', 'failed', 'pending'].map(id => ({
      id, title: id, detail: 'private detail', approval: createApproval('private-token', now),
    })) };
  saveKoHistory('a', [entry], { done: { kind: 'done', text: 'Saved' }, cancelled: { kind: 'cancelled' },
    failed: { kind: 'failed', text: 'Error' } });
  expect(JSON.parse(values.get('kochivo.ko.chat.a') ?? '')).toEqual([{
    speaker: 'ko', text: 'Reply', contextText: 'Context', timestamp: now, actions: [
      { title: 'done', state: { kind: 'done', text: 'Saved' } },
      { title: 'cancelled', state: { kind: 'cancelled' } },
      { title: 'failed', state: { kind: 'failed', text: 'Error' } },
      { title: 'pending', state: { kind: 'expired' } },
    ],
  }]);
  const [restored] = loadKoHistory('a', now);
  expect(restored).toMatchObject({ text: 'Reply', contextText: 'Context', timestamp: now });
  expect(restored?.actions?.at(-1)?.approval.expired(now)).toBe(true);
  expect(restored?.actions?.at(-1)?.approval.take(now)).toBeNull();
  expect(loadKoHistory('b', now)).toEqual([]);
});

it('keeps the last 40 entries and drops history older than seven days', () => {
  storage();
  const cutoff = now - 7 * 86_400_000;
  const entries = Array.from({ length: 42 }, (_, i): Entry => ({
    speaker: 'user', text: String(i), timestamp: cutoff + i - 3,
  }));
  saveKoHistory('a', entries, {});
  expect(loadKoHistory('a', cutoff).map(entry => entry.text)).toEqual(entries.slice(2).map(entry => entry.text));
  expect(loadKoHistory('a', now).map(entry => entry.text)).toEqual(entries.slice(3).map(entry => entry.text));
});

it('tolerates blocked storage', () => {
  const { setItem } = storage();
  setItem.mockImplementation(() => { throw new Error('blocked'); });
  expect(() => saveKoHistory('a', [{ speaker: 'user', text: 'Hi', timestamp: now }], {})).not.toThrow();
  expect(loadKoHistory('a', now)).toEqual([]);
});

it('does not recreate a saved conversation removed in another tab', () => {
  const { values } = storage();
  const key = 'kochivo.ko.chat.a';
  const entries: Entry[] = [{ speaker: 'user', text: 'Hi', timestamp: now }];
  expect(saveKoHistory('a', entries, {})).toBe(true);
  values.delete(key);
  expect(saveKoHistory('a', entries, {}, true)).toBe(false);
  expect(values.has(key)).toBe(false);
});

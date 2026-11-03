import { beforeEach, expect, it, vi } from 'vitest';
import { isValidElement } from 'react';
import type { ReactElement } from 'react';
import type * as ReactModule from 'react';
import type { CheckIn } from './data/checkins';

const hooks = vi.hoisted(() => ({ slots: [] as unknown[], cursor: 0, effects: [] as (() => void)[],
  list: vi.fn(), listened: vi.fn(), now: '2026-11-04T12:00:00Z' }));
vi.mock('react', async original => ({ ...await original<typeof ReactModule>(),
  useState: (initial: unknown) => {
    const i = hooks.cursor++;
    if (!(i in hooks.slots)) hooks.slots[i] = initial;
    return [hooks.slots[i], (value: unknown) => { hooks.slots[i] = typeof value === 'function' ? value(hooks.slots[i]) : value; }];
  },
  useEffect: (effect: () => void, deps: unknown[]) => {
    const i = hooks.cursor++;
    const previous = hooks.slots[i] as unknown[] | undefined;
    if (!previous || deps.some((dep, j) => !Object.is(dep, previous[j]))) hooks.effects.push(effect);
    hooks.slots[i] = deps;
  },
  useCallback: (callback: unknown) => callback,
}));
vi.mock('@/core/i18n/client', () => ({ useLocale: () => 'en', useT: () => (key: string) => key }));
vi.mock('@/features/voice-notes', () => ({ VoiceNoteList: () => null, listContextVoiceNotes: hooks.list, markListened: hooks.listened }));
vi.mock('@/core/supabase/lazy', () => ({ loadSupabaseBrowser: async () => ({}) }));
import { CheckinHistory } from './components/checkin-history';
import { VoiceNoteList } from '@/features/voice-notes';
import { ErrorState, LoadingState } from '@/ui';
const checkins: CheckIn[] = ['a', 'b', 'c'].map((id, i) => ({ id, player_id: 'player', week_start: '2026-10-31',
  body_weight_kg: null, waist_cm: null, notes: null, photo_paths: [], reviewed_at: i < 2 ? hooks.now : null, captain_reply: i === 0 ? 'Keep going' : null }));
const note = { id: 'n', url: 'signed', mimeType: 'audio/webm', durationSeconds: 12, contextId: 'a', listenedAt: null, createdAt: hooks.now };
function nodes(value: unknown): ReactElement<Record<string, unknown>>[] {
  if (Array.isArray(value)) return value.flatMap(nodes);
  return isValidElement<Record<string, unknown>>(value) ? [value, ...nodes(value.props.children)] : [];
}
function render() { hooks.cursor = 0; return nodes(CheckinHistory({ checkins, now: () => new Date(hooks.now) })); }
async function settle() { for (let i = 0; i < 10; i++) await Promise.resolve(); }
beforeEach(() => { hooks.slots = []; hooks.cursor = 0; hooks.effects = []; vi.clearAllMocks(); });

it('shows reply text, pending feedback, and only the notes belonging to each check-in', async () => {
  hooks.list.mockResolvedValue({ a: [note], b: [] });
  expect(render().some(node => node.type === LoadingState)).toBe(true);
  hooks.effects.splice(0).forEach(effect => effect()); await settle();
  const result = render();
  expect(hooks.list).toHaveBeenCalledTimes(1);
  expect(hooks.list).toHaveBeenCalledWith(expect.anything(), 'checkin', ['a', 'b']);
  expect(result.some(node => node.props.children === 'Keep going')).toBe(true);
  expect(result.some(node => node.props.children === 'noReplyYet')).toBe(true);
  expect(result.some(node => node.props.children === 'noVoiceReply')).toBe(true);
  const players = result.filter(node => node.type === VoiceNoteList);
  expect(players).toHaveLength(1);
  expect(players[0]?.props.notes).toEqual([note]);
  (players[0]?.props.onPlay as (n: typeof note) => void)(note); await settle();
  expect(hooks.listened).toHaveBeenCalledWith(expect.anything(), 'n', new Date(hooks.now));
  expect((render().find(node => node.type === VoiceNoteList)?.props.notes as typeof note[])[0]?.listenedAt).toBe(hooks.now.replace('Z', '.000Z'));
});

it('keeps text visible on voice load errors and lets the player retry', async () => {
  hooks.list.mockRejectedValueOnce(new Error('offline')).mockResolvedValueOnce({});
  render(); hooks.effects.splice(0).forEach(effect => effect()); await settle();
  const result = render();
  expect(result.some(node => node.props.children === 'Keep going')).toBe(true);
  (result.find(node => node.type === ErrorState)?.props.onRetry as () => void)();
  render(); hooks.effects.splice(0).forEach(effect => effect()); await settle();
  expect(render().some(node => node.type === ErrorState)).toBe(false);
});

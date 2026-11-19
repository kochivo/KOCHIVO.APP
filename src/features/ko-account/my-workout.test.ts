import { beforeEach, expect, it, vi } from 'vitest';
import type { KoActor } from './data/account';
import { executeIntent } from './data/execute';
import { parseIntent } from './data/intents';
import { isBigAction } from './data/limits';
import { messages } from './messages';

const { playerWorkout } = vi.hoisted(() => ({ playerWorkout: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/features/ai-tools/server', () => ({ playerWorkout }));
vi.mock('@/core/timezone/server', () => ({ getPlayerTimezone: async () => 'Africa/Cairo' }));

const actor = { id: 'player', role: 'player' } as KoActor;
const now = Date.parse('2026-11-19T22:05:00Z');
const run = (day?: 'today' | 'tomorrow', role: KoActor['role'] = 'player', locale: 'ar' | 'en' = 'ar') =>
  executeIntent({ ...actor, role }, { kind: 'my_workout', args: { day } }, locale, 'unused', now);

beforeEach(() => playerWorkout.mockReset());

it('parses a missing day as today and accepts tomorrow', () => {
  expect(parseIntent('my_workout', {}, ['my_workout'])).toEqual({ kind: 'my_workout', args: { day: 'today' } });
  expect(parseIntent('my_workout', { day: 'tomorrow' }, ['my_workout']))
    .toEqual({ kind: 'my_workout', args: { day: 'tomorrow' } });
});

it('lists up to ten exercises with localized names and Latin digits without an approval or credit', async () => {
  playerWorkout.mockResolvedValue({ rest: false, day: { title: 'Lower Body',
    exercises: Array.from({ length: 11 }, (_, index) => ({
      name_ar: `سكوات ${index}`, name_en: `Squat ${index}`, sets: 3, reps_min: 8, reps_max: index ? null : 12,
    })) } });
  const reply = await run();
  expect(reply).toEqual({ kind: 'message', text: [
    'تمرين النهارده: Lower Body', 'سكوات 0: 3 × 8-12', ...Array.from({ length: 9 }, (_, i) => `سكوات ${i + 1}: 3 × 8`),
  ].join('\n') });
  expect((await run('today', 'player', 'en')).text).toContain('Squat 0: 3 × 8-12');
  expect(playerWorkout).toHaveBeenCalledWith(expect.objectContaining({ timezone: 'Africa/Cairo' }), '2026-11-20');
  expect(isBigAction('my_workout')).toBe(false);
});

it('uses the next Cairo calendar date for tomorrow and describes both rest days', async () => {
  playerWorkout.mockResolvedValue({ day: null, rest: true });
  expect((await run()).text).toBe('النهارده راحة. ريّح جسمك واشرب مية كفاية.');
  expect((await run('tomorrow')).text).toBe('بكرة راحة. ريّح جسمك واشرب مية كفاية.');
  expect(playerWorkout).toHaveBeenLastCalledWith(expect.objectContaining({ timezone: 'Africa/Cairo' }), '2026-11-21');
});

it('explains that there is no active program', async () => {
  playerWorkout.mockResolvedValue(null);
  expect((await run()).text).toBe('مفيش برنامج تمرين نشط دلوقتي. اسأل الكابتن.');
});

it('returns unclear for captains without reading workout data', async () => {
  expect((await run('today', 'captain')).text).toBe(messages.ar.unclear);
  expect(playerWorkout).not.toHaveBeenCalled();
});

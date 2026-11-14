import { describe, expect, it, vi } from 'vitest';
import { emptyWarmup } from '@/features/programs';
import type { DraftDay } from '@/features/programs';
import { checkDays, checkMinutes, injuryOverlap, injuryCount, selectedMinutes, swapSuggestion } from './fit-checks';

vi.mock('server-only', () => ({}));

describe('program fit checks', () => {
  it('warns only when training days exceed availability', () => {
    expect(checkDays(4, [0, 1, 3, 4])).toBe(true);
    expect(checkDays(5, [0, 1, 3, 4])).toBe(false);
  });
  it('allows the session limit and warns above it', () => {
    expect(checkMinutes(60, 60)).toBe(true);
    expect(checkMinutes(61, 60)).toBe(false);
  });
  it('matches the day summary estimate including warm-up and cardio after edits', () => {
    const day: DraftDay = { id: 'day', program_id: 'p', title: '', position: 1,
      warmup: { ramp: false, items: [{ id: 'warm', name: 'Walk', unit: 'min', amount: 5 }] },
      cardio: [{ id: 'cardio', day_id: 'day', position: 1, kind: 'walk', minutes: 10, intensity: 'low', notes: '' }],
      exercises: [{ id: 'e', day_id: 'day', exercise_id: 'x', position: 1, sets: 3, reps_min: 8, reps_max: 12,
        rest_seconds: 90, rir: null, superset_group: null, notes: null, library: null }],
    };
    // 3 × (40 + 90) seconds rounds to 5 minutes; add 5 warm-up and 10 cardio.
    expect(selectedMinutes(day)).toBe(20);
    expect(selectedMinutes({ ...day, exercises: day.exercises.map(row => ({ ...row, sets: 10 })) })).toBe(35);
    expect(selectedMinutes({ ...day, is_rest_day: true })).toBe(0);
    expect(selectedMinutes({ ...day, exercises: [], warmup: emptyWarmup() })).toBeNull();
  });
  it('matches supported stress tags only, without guessing untagged exercises', () => {
    expect(injuryOverlap(['knee'], ['shoulder'])).toEqual([]);
    expect(injuryOverlap(['knee', 'other'], ['knee', 'other'])).toEqual(['knee']);
    expect(injuryOverlap(undefined, ['knee'])).toEqual([]);
    expect(injuryCount([['knee', 'shoulder'], undefined, []], ['knee', 'shoulder'])).toBe(1);
  });
  it('offers only one safe same-pattern replacement', () => {
    const candidates = [
      { exercise_id: 'a', pattern: 'squat', stress: ['knee'] },
      { exercise_id: 'b', pattern: 'squat', stress: [] },
      { exercise_id: 'c', pattern: 'squat', stress: [] },
    ];
    expect(swapSuggestion('a', ['knee'], candidates)).toEqual([candidates[1]]);
    expect(swapSuggestion('unknown', ['knee'], candidates)).toEqual([]);
  });
});

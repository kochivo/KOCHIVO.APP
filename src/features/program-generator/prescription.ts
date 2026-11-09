import type { GeneratorBrief } from './brief';

const table = {
  strength: { sets: 4, reps_min: 3, reps_max: 6, rest_seconds: 150, rir: 2 },
  muscle: { sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 90, rir: 1 },
  fat_loss: { sets: 3, reps_min: 10, reps_max: 15, rest_seconds: 60, rir: 2 },
  general: { sets: 3, reps_min: 8, reps_max: 12, rest_seconds: 75, rir: 3 },
} as const;

export function prescription(goal: GeneratorBrief['goal'], level: GeneratorBrief['level'], kind: 'compound' | 'isolation') {
  const base = table[goal];
  return { ...base, sets: Math.max(2, base.sets + (level === 'beginner' ? -1 : level === 'advanced' && kind === 'compound' ? 1 : 0)),
    rir: base.rir + (level === 'beginner' ? 1 : 0) };
}

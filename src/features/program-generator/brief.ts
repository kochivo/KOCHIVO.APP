import { z } from 'zod';

export const goals = ['fat_loss', 'muscle', 'strength', 'general'] as const;
export const levels = ['beginner', 'intermediate', 'advanced'] as const;
export const equipmentTiers = ['bodyweight', 'dumbbells', 'gym'] as const;
export const injuries = ['knee', 'shoulder', 'lower_back'] as const;

export const generatorBriefSchema = z.strictObject({
  goal: z.enum(goals), level: z.enum(levels),
  // Builder weekdays start with Saturday, unlike intake's Sunday-based dates.
  weekdays: z.array(z.number().int().min(0).max(6)).min(2).max(6)
    .refine(days => new Set(days).size === days.length),
  minutes: z.union([z.literal(45), z.literal(60), z.literal(90)]),
  equipment: z.enum(equipmentTiers),
  injuries: z.array(z.enum(injuries)).max(3).refine(rows => new Set(rows).size === rows.length),
  playerId: z.uuid().optional(), seed: z.number().int().nonnegative().max(Number.MAX_SAFE_INTEGER),
});

export type GeneratorBrief = z.infer<typeof generatorBriefSchema>;

export type IntakeDefaults = { trainingDays?: number[]; experience?: string; sessionMinutes?: number; injuries?: string[] };
export function initialBrief(intake?: IntakeDefaults | null, seed = 0, playerId?: string): GeneratorBrief {
  const days = [...new Set((intake?.trainingDays ?? []).filter(day => Number.isInteger(day) && day >= 0 && day <= 6)
    .map(day => (day + 1) % 7))].sort((a, b) => a - b);
  const minutes = intake?.sessionMinutes;
  return { goal: 'general', level: intake?.experience === 'over_3y' ? 'advanced' : intake?.experience === '1_3y' ? 'intermediate' : 'beginner',
    weekdays: days.length >= 2 && days.length <= 6 ? days : [0, 2, 4],
    minutes: minutes === 45 || minutes === 60 || minutes === 90 ? minutes : 60,
    equipment: 'gym', injuries: injuries.filter(injury => intake?.injuries?.includes(injury)), seed,
    ...(playerId ? { playerId } : {}) };
}

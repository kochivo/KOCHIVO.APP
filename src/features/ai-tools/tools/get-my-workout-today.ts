import 'server-only';
import { z } from 'zod';
import { localDate } from '@/lib/dates';
import { targetForSet } from '@/lib/set-plan';
import { playerWorkout } from '../data/player-workout';
import { defineTool } from '../define-tool';

export const getMyWorkoutToday = defineTool({
  name: 'get_my_workout_today',
  description: "Read today's workout exercises, sets, reps, and rest times. Returns null on a rest day or without an active program.",
  input: z.strictObject({}),
  output: z.object({
    title: z.string().nullable(),
    exercises: z.array(z.object({
      name: z.string(), sets: z.number(), restSeconds: z.number().nullable(),
      reps: z.array(z.object({ min: z.number(), max: z.number().nullable() })),
    })),
  }).nullable(),
  roles: ['player'],
  kind: 'read',
  async run(ctx) {
    const workout = await playerWorkout(ctx, localDate(ctx.now, ctx.timezone));
    if (!workout?.day || workout.rest) return null;
    return {
      title: workout.day.title,
      exercises: workout.day.exercises.map(row => ({
        name: row.name_en || row.name_ar || '', sets: row.sets, restSeconds: row.rest_seconds,
        reps: Array.from({ length: row.sets }, (_, index) => {
          const target = targetForSet(row, index);
          return { min: target.reps_min, max: target.reps_max };
        }),
      })),
    };
  },
});

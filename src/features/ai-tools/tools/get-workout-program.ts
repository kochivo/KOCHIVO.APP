import { z } from 'zod';
import { checked } from '../data/read';
import { defineTool } from '../define-tool';
import { ToolError } from '../tool-error';

export const getWorkoutProgram = defineTool({
  name: 'get_workout_program',
  description: 'Get a workout program’s days and exercise prescriptions, with rest in seconds.',
  input: z.strictObject({ programId: z.uuid() }),
  output: z.object({ days: z.array(z.object({
    title: z.string(),
    exercises: z.array(z.object({
      name: z.string().nullable(), sets: z.number().int(), reps_min: z.number().int(),
      reps_max: z.number().int().nullable(), rest: z.number().int(),
    })),
  })) }),
  roles: ['captain'],
  kind: 'read',
  async run({ actor: { db, id }, signal }, { programId }) {
    const program = checked(await db.from('programs').select(
      'program_days(title,position,program_exercises(position,sets,reps_min,reps_max,rest_seconds,exercises(name_en)))',
    ).eq('id', programId).eq('captain_id', id).abortSignal(signal).maybeSingle());
    if (!program) throw new ToolError('not_found');
    return { days: program.program_days.sort(byPosition).map(day => ({
      title: day.title,
      exercises: day.program_exercises.sort(byPosition).map(row => ({
        name: row.exercises?.name_en ?? null, sets: row.sets,
        reps_min: row.reps_min, reps_max: row.reps_max, rest: row.rest_seconds,
      })),
    })) };
  },
});

function byPosition(a: { position: number }, b: { position: number }) {
  return a.position - b.position;
}

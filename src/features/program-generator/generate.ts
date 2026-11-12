import type { DraftDay, DraftExercise, ProgramDraft } from '@/features/programs';
import { uuidv7 } from '@/core/offline/ids';
import { generatorBriefSchema } from './brief';
import { eligible, pick, seededRandom, selectionReasons } from './pick';
import type { Candidate, Pattern, Reason } from './pick';
import { prescription } from './prescription';
import { slotRecipes } from './splits';

export type GeneratedExercise = Omit<DraftExercise, 'id' | 'day_id'> & {
  reasons: Reason[]; alternatives: string[]; replacedPattern?: Pattern;
};
export type GeneratedDay = Omit<DraftDay, 'id' | 'program_id' | 'exercises'> & { exercises: GeneratedExercise[] };
// Persistence identities are allocated once when the caller accepts the deterministic draft.
export type GeneratedProgram = Omit<ProgramDraft, 'id' | 'days'> & { days: GeneratedDay[] };
export type GenerationError = { code: 'invalid_brief' } |
  { code: 'unfilled_slot'; weekday: number; slot: number; pattern: Pattern };
export type GenerationResult = { data: GeneratedProgram; error?: never } | { error: GenerationError; data?: never };

export function generateProgram(input: unknown, candidates: readonly Candidate[]): GenerationResult {
  const parsed = generatorBriefSchema.safeParse(input);
  if (!parsed.success) return { error: { code: 'invalid_brief' } };
  const brief = parsed.data;
  const safe = eligible(brief, candidates);
  const uninjured = eligible({ ...brief, injuries: [] }, candidates);
  const random = seededRandom(brief.seed);
  const used = new Set<string>();
  const recipes = slotRecipes(brief);
  const weekdays = [...brief.weekdays].sort((a, b) => a - b);
  const days: GeneratedDay[] = [];
  for (let weekday = 0; weekday < 7; weekday++) {
    const recipeIndex = weekdays.indexOf(weekday);
    const slots = recipes[recipeIndex] ?? [];
    const exercises: GeneratedExercise[] = [];
    const kinds = new Map<string, Candidate['kind']>();
    const dayUsed = new Set<string>();
    for (const [slot, pattern] of slots.entries()) {
      const choice = pick(pattern, safe, dayUsed, used, random);
      if (!choice) return { error: { code: 'unfilled_slot', weekday, slot, pattern } };
      const { selected, alternatives } = choice;
      dayUsed.add(selected.exercise_id);
      kinds.set(selected.exercise_id, selected.kind);
      used.add(selected.exercise_id);
      const reasons = selectionReasons(pattern, selected, brief, uninjured);
      exercises.push({ exercise_id: selected.exercise_id, library: selected.library, position: slot + 1,
        superset_group: null, ...prescription(brief.goal, brief.level, selected.kind), reasons, alternatives,
        ...(selected.pattern === pattern ? {} : { replacedPattern: pattern }) });
    }
    exercises.sort((a, b) => Number(kinds.get(a.exercise_id) === 'isolation') - Number(kinds.get(b.exercise_id) === 'isolation'));
    days.push({ weekday, position: weekday + 1, title: '', is_rest_day: recipeIndex < 0, cardio: [], warmup: { items: [], ramp: false },
      exercises: exercises.map((row, index) => ({ ...row, position: index + 1 })) });
  }
  // The consuming UI supplies the translated program title before saving.
  return { data: { player_id: brief.playerId ?? null, title: '', status: 'draft', repeatWeekly: true, days } };
}

export function toProgramDraft(generated: GeneratedProgram, programId: string, title: string,
  id: () => string = uuidv7): ProgramDraft {
  return { ...generated, id: programId, title, days: generated.days.map(day => {
    const dayId = id();
    return { ...day, id: dayId, program_id: programId,
      exercises: day.exercises.map(row => ({ ...row, id: id(), day_id: dayId })) };
  }) };
}

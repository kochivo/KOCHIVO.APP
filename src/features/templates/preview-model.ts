import type { Tables } from '@/types/database';

type Named = Pick<Tables<'exercises'>, 'name_ar' | 'name_en'>;
export type ProgramRow = { program_days: (Pick<Tables<'program_days'>, 'position' | 'title'> & {
  program_exercises: (Pick<Tables<'program_exercises'>, 'position' | 'sets' | 'reps_min' | 'reps_max'> & { exercises: Named | null })[];
})[] };
export type PlanRow = { meals: (Pick<Tables<'meals'>, 'position' | 'name'> & {
  meal_items: (Pick<Tables<'meal_items'>, 'position' | 'grams'> & {
    foods: Pick<Tables<'foods'>, 'name_ar' | 'name_en' | 'kcal_per_100g'> | null;
  })[];
})[] };

export type PreviewExercise = Named & { sets: number; reps: string };
export type PreviewFood = Named & { grams: number; kcal: number };
export type TemplatePreview =
  | { kind: 'program'; groups: { title: string; items: PreviewExercise[] }[] }
  | { kind: 'nutrition'; groups: { title: string; items: PreviewFood[] }[]; kcal: number };

const byPosition = <T extends { position: number }>(rows: T[]) => [...rows].sort((a, b) => a.position - b.position);

export function reps(min: number, max: number | null): string {
  return max && max !== min ? `${min}–${max}` : String(min);
}

export function programPreview(row: ProgramRow): TemplatePreview {
  return { kind: 'program', groups: byPosition(row.program_days).map(day => ({
    title: day.title,
    items: byPosition(day.program_exercises).map(item => ({
      name_ar: item.exercises?.name_ar ?? null, name_en: item.exercises?.name_en ?? '',
      sets: item.sets, reps: reps(item.reps_min, item.reps_max),
    })),
  })) };
}

export function nutritionPreview(row: PlanRow): TemplatePreview {
  const groups = byPosition(row.meals).map(meal => ({
    title: meal.name,
    items: byPosition(meal.meal_items).map(item => ({
      name_ar: item.foods?.name_ar ?? null, name_en: item.foods?.name_en ?? '', grams: item.grams,
      kcal: Math.round(item.grams * (item.foods?.kcal_per_100g ?? 0) / 100),
    })),
  }));
  return { kind: 'nutrition', groups, kcal: groups.flatMap(group => group.items).reduce((sum, item) => sum + item.kcal, 0) };
}

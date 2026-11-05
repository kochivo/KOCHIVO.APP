import fs from 'node:fs';
import { expect, it } from 'vitest';

const read = (name: string) => JSON.parse(fs.readFileSync(
  new URL(`../../supabase/seed/source/${name}.json`, import.meta.url), 'utf8'));
type Item = { seed_key: string; grams: number; alternatives: { seed_key: string; grams: number }[] };
type Template = {
  key: string; kind: 'workout' | 'nutrition'; title: string;
  days?: { title: string; exercises: { dataset_id: string; sets: number; reps_min: number;
    reps_max: number; rest_seconds: number; superset_group?: number }[] }[];
  meals?: { name: string; items: Item[] }[];
  targets?: { kcal: number; protein: number; carbs: number; fat: number };
};
type Food = { photo_file: string; kcal_per_100g: number; protein_per_100g: number;
  carbs_per_100g: number; fat_per_100g: number };
const templates = read('starter-templates') as Template[];
const foods = new Map((read('foods-starter') as Food[]).map(f => [f.photo_file.replace(/\.[^.]+$/, ''), f]));
const food = (key: string) => {
  const value = foods.get(key);
  if (!value) throw new Error(`Unknown food ${key}`);
  return value;
};

it('provides the six workout schedules and four nutrition plans with valid seed references', () => {
  const exercises = new Set((read('exercises-gif') as { dataset_id: string }[]).map(e => e.dataset_id));
  const high = new Set((read('exercise-names-ar.proposed') as { dataset_id: string; confidence: string }[])
    .filter(e => e.confidence === 'high').map(e => e.dataset_id));
  expect(templates.filter(t => t.kind === 'workout').map(t => t.days?.length)).toEqual([3, 4, 6, 3, 3, 4]);
  expect(templates.filter(t => t.kind === 'nutrition')).toHaveLength(4);
  expect(new Set(templates.map(t => t.key)).size).toBe(10);
  for (const template of templates) {
    for (const day of template.days ?? []) {
      expect(day.exercises.length).toBeGreaterThanOrEqual(3);
      for (const e of day.exercises) {
        expect(exercises.has(e.dataset_id), e.dataset_id).toBe(true);
        expect(high.has(e.dataset_id), e.dataset_id).toBe(true);
        expect(e.sets).toBeGreaterThanOrEqual(2);
        expect(e.sets).toBeLessThanOrEqual(4);
        expect(e.reps_max).toBeGreaterThanOrEqual(e.reps_min);
        expect(e.rest_seconds).toBeGreaterThanOrEqual(30);
      }
    }
    for (const meal of template.meals ?? []) for (const item of meal.items) {
      expect(foods.has(item.seed_key), item.seed_key).toBe(true);
      expect(item.grams).toBeGreaterThan(0);
      for (const alt of item.alternatives) {
        expect(foods.has(alt.seed_key), alt.seed_key).toBe(true);
        expect(alt.grams).toBeGreaterThan(0);
        expect(Math.abs(food(alt.seed_key).kcal_per_100g * alt.grams /
          (food(item.seed_key).kcal_per_100g * item.grams) - 1)).toBeLessThanOrEqual(0.1);
      }
    }
  }
});

it('keeps each daily macro target within ten percent of the primary items', () => {
  for (const template of templates.filter(t => t.kind === 'nutrition')) {
    expect(template.targets).toBeDefined();
    for (const macro of ['kcal', 'protein', 'carbs', 'fat'] as const) {
      const total = (template.meals ?? []).flatMap(m => m.items).reduce((sum, item) =>
        sum + food(item.seed_key)[`${macro}_per_100g`] * item.grams / 100, 0);
      expect(total).toBeGreaterThan(0);
      expect(Math.abs((template.targets?.[macro] ?? 0) / total - 1), `${template.key}: ${macro}`)
        .toBeLessThanOrEqual(0.1);
    }
  }
});

it('uses dumbbells without a bench at home and shorter Ramadan sessions with longer rest', () => {
  const exerciseMap = new Map((read('exercises-gif') as { dataset_id: string; equipment: string; name_en: string }[])
    .map(e => [e.dataset_id, e]));
  const home = templates.find(t => t.key === 'home-dumbbells');
  expect(home?.days).toHaveLength(3);
  for (const day of home?.days ?? []) for (const e of day.exercises) {
    expect(exerciseMap.get(e.dataset_id)?.equipment).toBe('dumbbell');
    expect(exerciseMap.get(e.dataset_id)?.name_en).not.toMatch(/bench|seated|incline/i);
  }
  const ramadan = templates.find(t => t.key === 'ramadan-workout');
  expect(ramadan?.days).toHaveLength(4);
  for (const day of ramadan?.days ?? []) {
    expect(day.exercises).toHaveLength(3);
    for (const e of day.exercises) {
      expect(e.sets).toBe(2);
      expect(e.rest_seconds).toBeGreaterThanOrEqual(120);
    }
  }
  expect(templates.find(t => t.key === 'ramadan-nutrition')?.meals?.map(m => m.name))
    .toEqual(['الفطار', 'سناك خفيف', 'السحور']);
});

it('embeds the same library in the migrations and source JSON', () => {
  const sql = fs.readFileSync(new URL('../../supabase/migrations/0030_starter_templates.sql', import.meta.url), 'utf8');
  const payload = sql.match(/\$starter_library\$([\s\S]*?)\$starter_library\$/)?.[1];
  expect(payload).toBeDefined();
  // 0030 is immutable; 0034 rewrites its Arabic-Indic digits to Latin, as the source JSON now has.
  const latin = (payload ?? 'null').replace(/[٠-٩]/g, c => String(c.charCodeAt(0) - 0x660));
  expect(JSON.parse(latin)).toEqual(templates);
});

import { uuidv7 } from '@/core/offline/ids';
import type { ImportPayload } from './import-payload';
import type { Json } from '@/types/database';

function bodyPart(muscle: string) {
  if (/صدر/.test(muscle)) return 'chest';
  if (/ضهر|ظهر/.test(muscle)) return 'back';
  if (/كتف|أكتاف/.test(muscle)) return 'shoulders';
  if (/دراع|ذراع/.test(muscle)) return 'upper arms';
  if (/سمانة/.test(muscle)) return 'lower legs';
  if (/فخذ|مقربات/.test(muscle)) return 'upper legs';
  return muscle.trim() || 'other';
}

export function importRows(input: ImportPayload, durationNotes: string, fingerprint: string): Json {
  if (input.kind === 'training') return {
    fingerprint, source: input.source, notes: durationNotes,
    days: input.days.map(day => ({
      id: uuidv7(), name: day.name,
      warmup: { items: day.warmup.map(item => ({ ...item, id: uuidv7(), unit: 'reps' })), ramp: false },
      exercises: day.exercises.map(row => ({
        id: uuidv7(), exerciseId: uuidv7(), name: row.name, bodyPart: bodyPart(row.muscle),
        sets: row.sets, repsMin: row.repsMin, repsMax: row.repsMax, rest: row.rest, note: row.note,
        setPlan: row.rirs.map(rir => ({ reps_min: row.repsMin, reps_max: row.repsMax, rir })),
      })),
    })),
  };
  return {
    fingerprint, source: input.source, targets: input.targets, water: input.water,
    meals: input.meals.map(meal => ({
      id: uuidv7(), name: meal.name, items: meal.items.map(row => {
        const grams = row.amount * row.gramsPerUnit;
        const rate = (value: number) => Math.round(value / grams * 1000) / 10;
        return {
          id: uuidv7(), foodId: uuidv7(), name: row.name, grams,
          unit: row.unit === 'g' ? null : row.unit,
          units: row.unit === 'g' ? [] : [{
            key: row.unit, name_ar: row.unit === 'ml' ? 'مل' : 'حبة',
            name_en: row.unit === 'ml' ? 'ml' : 'piece', grams: row.gramsPerUnit,
          }],
          kcal: rate(row.kcal), protein: rate(row.protein), carbs: rate(row.carbs), fat: rate(row.fat),
        };
      }),
    })),
  };
}

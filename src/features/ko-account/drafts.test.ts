import { expect, it, vi } from 'vitest';
import type { KoActor } from './account';
import { buildDraft } from './drafts';

function withCatalog(rows: object[]) {
  const query = { select: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(), range: vi.fn().mockResolvedValue({ data: rows, error: null }) };
  return { db: { from: () => query } } as unknown as KoActor;
}

it('keeps Saturday and Sunday in the order and weekday numbering used by Kochivo', async () => {
  const actor = withCatalog([{ id: 'catalog', name_en: 'Squat', name_ar: 'سكوات' }]);
  const result = await buildDraft(actor, { kind: 'create_training', args: {
    title: 'Training', player: 'Ahmed', days: [
      { title: 'Sunday', weekday: 0, exercises: [{ name: 'Squat', sets: 3, reps: 8 }] },
      { title: 'Saturday', weekday: 6, exercises: [{ name: 'Squat', sets: 3, reps: 8 }] },
    ],
  } });
  expect(result?.payload).toMatchObject({ days: [
    { title: 'Saturday', weekday: 0, position: 1 }, { title: 'Sunday', weekday: 1, position: 2 },
    ...[2, 3, 4, 5, 6].map(weekday => ({ weekday, is_rest_day: true })),
  ] });
});

it('calculates draft totals from catalog quantities rather than presenting target numbers as actuals', async () => {
  const actor = withCatalog([{ id: 'food', name_en: 'Rice', name_ar: 'رز',
    kcal_per_100g: 130, protein_per_100g: 2, carbs_per_100g: 28, fat_per_100g: 1 }]);
  const result = await buildDraft(actor, { kind: 'create_nutrition', args: {
    title: 'Meals', player: 'Ahmed', targets: { kcal: 2000, protein: 140, carbs: 200, fat: 65 },
    meals: [{ name: 'Lunch', items: [{ food: 'Rice', grams: 50 }] }],
  } });
  expect(result?.actual).toEqual({ kcal: 65, protein: 1, carbs: 14, fat: 0.5 });
});

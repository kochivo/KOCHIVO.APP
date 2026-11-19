import { expect, it, vi } from 'vitest';
import type { KoActor } from './data/account';
import { buildDraft } from './data/drafts';

function withCatalog(rows: object[]) {
  const query = { select: vi.fn().mockReturnThis(), is: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(), range: vi.fn().mockResolvedValue({ data: rows, error: null }) };
  return { db: { from: () => query } } as unknown as KoActor;
}

it('calculates draft totals from catalog quantities rather than presenting target numbers as actuals', async () => {
  const actor = withCatalog([{ id: 'food', name_en: 'Rice', name_ar: 'رز',
    kcal_per_100g: 130, protein_per_100g: 2, carbs_per_100g: 28, fat_per_100g: 1 }]);
  const result = await buildDraft(actor, { kind: 'create_nutrition', args: {
    title: 'Meals', player: 'Ahmed', targets: { kcal: 2000, protein: 140, carbs: 200, fat: 65 },
    meals: [{ name: 'Lunch', items: [{ food: 'Rice', grams: 50 }] }],
  } });
  expect(result?.actual).toEqual({ kcal: 65, protein: 1, carbs: 14, fat: 0.5 });
});

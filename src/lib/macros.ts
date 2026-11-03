export interface Per100g {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Macros {
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

/** Macros for a given amount of a food whose values are stored per 100g. */
export function macrosFor(food: Per100g, grams: number): Macros {
  const f = grams / 100;
  return {
    kcal: Math.round(food.kcal * f),
    protein: round1(food.protein * f),
    carbs: round1(food.carbs * f),
    fat: round1(food.fat * f),
  };
}

export function sumMacros(items: readonly Macros[]): Macros {
  const total = items.reduce(
    (acc, m) => ({ kcal: acc.kcal + m.kcal, protein: acc.protein + m.protein, carbs: acc.carbs + m.carbs, fat: acc.fat + m.fat }),
    { kcal: 0, protein: 0, carbs: 0, fat: 0 },
  );
  return { kcal: Math.round(total.kcal), protein: round1(total.protein), carbs: round1(total.carbs), fat: round1(total.fat) };
}

/**
 * Grams of `alternative` with the same calories as `grams` of `original`, rounded to 5g
 * so the player gets a number they can actually weigh. Used by the smart-swap builder.
 */
export function equivalentGrams(original: Per100g, grams: number, alternative: Per100g): number {
  if (alternative.kcal <= 0) throw new Error('Alternative food must have calories');
  const raw = (original.kcal * grams) / alternative.kcal;
  return Math.max(5, Math.round(raw / 5) * 5);
}

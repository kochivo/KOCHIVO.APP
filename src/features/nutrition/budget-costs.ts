import type { NutritionMeal } from '@/core/offline';
import type { BudgetFood, BudgetItem, BudgetDay } from '@/features/meal-plans';

export function pricedDay(meals: NutritionMeal[], foods: BudgetFood[], swaps: Record<string, string> = {}) {
  const priced = meals.map(meal => {
    const items: BudgetItem[] = [];
    let complete = meal.items.length > 0;
    for (const item of meal.items) {
      const chosen = item.alternatives.find(alt => alt.id === swaps[item.id]) ?? item;
      // Offline snapshots predate food ids. Match the stored catalog name and nutrition together.
      const food = foods.find(food => food.name === chosen.name && food.kcal === chosen.per100g.kcal && food.protein === chosen.per100g.protein);
      if (food) items.push({ food, grams: chosen.grams });
      else complete = false;
    }
    return { id: meal.id, items, costEgp: complete ? Math.round(items.reduce((sum, item) => sum + item.grams * item.food.pricePerGram, 0) * 100) / 100 : null };
  });
  const costEgp = priced.every(meal => meal.costEgp !== null) ? priced.reduce((sum, meal) => sum + (meal.costEgp ?? 0), 0) : null;
  const day: BudgetDay = { feasible: true, shortBy: 0, costEgp: costEgp ?? 0, macros: { kcal: 0, protein: 0, carbs: 0, fat: 0 },
    meals: priced.map(meal => ({ ...meal, tag: 'main', costEgp: meal.costEgp ?? 0, macros: { kcal: 0, protein: 0, carbs: 0, fat: 0 } })) };
  return { meals: priced, costEgp, day };
}

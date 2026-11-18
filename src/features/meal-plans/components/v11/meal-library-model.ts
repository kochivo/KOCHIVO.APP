export type MealLibraryPlan = {
  id: string;
  title: string;
  kcal: number | null;
  protein: number | null;
  carbs: number | null;
  fat: number | null;
  meals: number;
  players: { id: string; name: string | null }[];
  tag: 'draft' | 'training' | 'rest' | 'split' | 'allDays' | 'ramadan';
};

export function filterMealPlans(plans: MealLibraryPlan[], search: string, filter: string) {
  const query = search.trim().toLowerCase();
  const matches = plans.filter(plan => plan.title.toLowerCase().includes(query));
  const assigned = matches.filter(plan => plan.players.length > 0).length;
  return {
    plans: matches.filter(plan => filter === 'all' || (plan.players.length > 0) === (filter === 'assigned')),
    counts: { all: matches.length, assigned, unassigned: matches.length - assigned },
  };
}

export function macroSplit({ protein, carbs, fat }: Pick<MealLibraryPlan, 'protein' | 'carbs' | 'fat'>) {
  const calories = [(protein ?? 0) * 4, (carbs ?? 0) * 4, (fat ?? 0) * 9];
  const total = calories.reduce((sum, value) => sum + value, 0);
  return calories.map(value => total > 0 ? value / total * 100 : 0);
}

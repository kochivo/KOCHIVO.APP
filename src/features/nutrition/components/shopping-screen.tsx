'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { ShoppingList, foodBudgetMessages } from '@/features/meal-plans';
import { Button } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { useNutritionSnapshot } from '../hooks/use-nutrition-snapshot';
import { useFoodPrices } from '../hooks/use-food-prices';
import { pricedDay } from '../budget-costs';

export function ShoppingScreen() {
  const nutrition = useNutritionSnapshot(), prices = useFoodPrices(), t = useT(foodBudgetMessages), locale = useLocale();
  if (nutrition.status === 'error' || prices.error) return <div role="alert">{t('error')}<Button variant="secondary" onClick={() => { nutrition.retry(); void prices.retry(); }}>{t('retry')}</Button></div>;
  if (nutrition.status === 'loading' || !prices.data) return <LoadingState />;
  if (!nutrition.snapshot || !prices.data.monthly) return <p className="p-card text-muted">{t('noItems')}</p>;
  const data = prices.data;
  const foods = data.foods.flatMap(row => row.budgetFood ? [row.budgetFood] : []);
  const today = new Date(`${nutrition.today}T12:00:00Z`);
  const days = Array.from({ length: 7 }, (_, index) => {
    const weekday = (today.getUTCDay() + index) % 7;
    const rest = !data.trainingDays.includes(weekday);
    const meals = nutrition.snapshot?.meals.filter(meal => !meal.day_type || meal.day_type === 'all' || meal.day_type === (rest ? 'rest' : 'training')) ?? [];
    const { day } = pricedDay(meals, foods);
    return { ...day, meals: day.meals.map(meal => ({ ...meal, items: meal.items.map(item => ({ ...item, food: { ...item.food,
      name: locale === 'en' ? data.foods.find(food => food.id === item.food.id)?.name_en || item.food.name : item.food.name,
    } })) })) };
  });
  return <main className="mx-auto max-w-lg p-card pb-32"><ShoppingList days={days} /></main>;
}

'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { ShoppingList, foodBudgetMessages } from '@/features/meal-plans';
import { Button } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { useNutritionSnapshot } from '../hooks/use-nutrition-snapshot';
import { useFoodPrices } from '../hooks/use-food-prices';
import { pricedDay } from '../budget-costs';
import { useCallback, useState } from 'react';
import { localDb, useLiveQuery } from '@/core/offline';
import { shoppingWeekRestDays } from './day-type';

export function ShoppingScreen() {
  const nutrition = useNutritionSnapshot(), prices = useFoodPrices(), t = useT(foodBudgetMessages), locale = useLocale();
  const [scheduleError, setScheduleError] = useState(false), [revision, setRevision] = useState(0);
  const onError = useCallback(() => setScheduleError(true), []);
  const readWeek = useCallback(async () => {
    const db = localDb();
    const [snapshot, sessions] = await Promise.all([db.program_snapshot.get('active'), db.workout_sessions.toArray()]);
    return nutrition.today ? shoppingWeekRestDays(snapshot ?? null, sessions, nutrition.today) : undefined;
  }, [nutrition.today]);
  const restDays = useLiveQuery(readWeek, onError, revision);
  if (nutrition.status === 'error' || prices.error || scheduleError) return <div role="alert">{t('error')}<Button variant="secondary" onClick={() => { nutrition.retry(); void prices.retry(); setScheduleError(false); setRevision(value => value + 1); }}>{t('retry')}</Button></div>;
  if (nutrition.status === 'loading' || !prices.data || !restDays) return <LoadingState />;
  if (!nutrition.snapshot || !prices.data.monthly) return <p className="p-card text-muted">{t('noItems')}</p>;
  const data = prices.data;
  const foods = data.foods.flatMap(row => row.budgetFood ? [row.budgetFood] : []);
  const days = restDays.map(rest => {
    const meals = nutrition.snapshot?.meals.filter(meal => !meal.day_type || meal.day_type === 'all' || meal.day_type === (rest ? 'rest' : 'training')) ?? [];
    const { day } = pricedDay(meals, foods);
    return { ...day, meals: day.meals.map(meal => ({ ...meal, items: meal.items.map(item => ({ ...item, food: { ...item.food,
      name: locale === 'en' ? data.foods.find(food => food.id === item.food.id)?.name_en || item.food.name : item.food.name,
    } })) })) };
  });
  return <main className="mx-auto max-w-lg p-card pb-32"><ShoppingList days={days} /></main>;
}

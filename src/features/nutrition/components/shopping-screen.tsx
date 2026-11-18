'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { foodBudgetMessages } from '@/features/meal-plans';
import { Button, buttonClass } from '@/ui/button';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ChevronRight } from 'lucide-react';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { formatNumber } from '@/lib/format';
import { messages } from '../player-v4/messages';
import { shoppingItems } from '../shopping-items';
import { ShoppingWeekList } from './shopping-week-list';
import { LoadingState } from '@/ui/loading-state';
import { useNutritionSnapshot } from '../hooks/use-nutrition-snapshot';
import { useFoodPrices } from '../hooks/use-food-prices';
import { pricedDay } from '../budget-costs';
import { useCallback, useState } from 'react';
import { localDb, useLiveQuery } from '@/core/offline';
import { shoppingWeekRestDays } from './day-type';

const ShoppingList = dynamic(() => import('@/features/meal-plans').then(module => module.ShoppingList));

export function ShoppingScreen() {
  const nutrition = useNutritionSnapshot(), prices = useFoodPrices(), t = useT(foodBudgetMessages), locale = useLocale();
  const v4t = useT(messages), v4 = captainWorkspaceEnabled();
  const [scheduleError, setScheduleError] = useState(false), [revision, setRevision] = useState(0);
  const onError = useCallback(() => setScheduleError(true), []);
  const readWeek = useCallback(async () => {
    const db = localDb();
    const [snapshot, sessions] = await Promise.all([db.program_snapshot.get('active'), db.workout_sessions.toArray()]);
    return nutrition.today ? shoppingWeekRestDays(snapshot ?? null, sessions, nutrition.today) : undefined;
  }, [nutrition.today]);
  const restDays = useLiveQuery(readWeek, onError, revision);
  function content() {
    if (nutrition.status === 'error' || prices.error || scheduleError) return <div role="alert">{t('error')}<Button variant="secondary" onClick={() => { nutrition.retry(); void prices.retry(); setScheduleError(false); setRevision(value => value + 1); }}>{t('retry')}</Button></div>;
    if (nutrition.status === 'loading' || !prices.data || !restDays) return <LoadingState />;
    if (!nutrition.snapshot || (!v4 && !prices.data.monthly)) return <p className="p-card text-muted">{v4 ? v4t('empty') : t('noItems')}</p>;
    const data = prices.data;
    const foods = data.foods.flatMap(row => row.budgetFood ? [row.budgetFood] : []);
    const mealsByDay = restDays.map(rest => nutrition.snapshot?.meals.filter(meal =>
      !meal.day_type || meal.day_type === 'all' || meal.day_type === (rest ? 'rest' : 'training')) ?? []);
    const days = mealsByDay.map(meals => {
      const { day } = pricedDay(meals, foods);
      return { ...day, meals: day.meals.map(meal => ({ ...meal, items: meal.items.map(item => ({ ...item, food: { ...item.food,
        name: locale === 'en' ? data.foods.find(food => food.id === item.food.id)?.name_en || item.food.name : item.food.name,
      } })) })) };
    });
    return v4 ? <ShoppingWeekList key={nutrition.today} {...shoppingItems(days, mealsByDay, data.foods, Boolean(data.monthly), locale === 'en')} />
      : <main className="mx-auto max-w-lg p-card pb-32"><ShoppingList days={days} /></main>;
  }
  if (!v4) return content();
  return <main className="mx-auto max-w-lg space-y-card-gap px-page-x pt-card pb-32">
    <header className="flex min-h-12 items-center gap-inline">
      <Link href="/player/nutrition" aria-label={v4t('back')} className={buttonClass({ variant: 'secondary', className: 'size-12 shrink-0 px-0' })}><ChevronRight aria-hidden className="dir-icon size-5" /></Link>
      <div className="min-w-0"><h1 className="text-title font-bold">{t('shopping')}</h1>
        <p className="text-xs text-muted">{v4t('week', { days: formatNumber(7, locale) })}</p></div>
    </header>
    {content()}
  </main>;
}

'use client';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import type { NutritionMeal } from '@/core/offline';
import { BudgetPrice, cheaperSwap, foodBudgetMessages } from '@/features/meal-plans';
import { formatNumber } from '@/lib/format';
import { Button, buttonClass } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { useFoodPrices } from '../hooks/use-food-prices';
import { pricedDay } from '../budget-costs';

export function BudgetSummary({ meals, swaps }: { meals: NutritionMeal[]; swaps: Record<string, string> }) {
  const resource = useFoodPrices(), t = useT(foodBudgetMessages), locale = useLocale();
  if (!resource.data) return resource.error ? <div role="alert">{t('error')}<Button variant="secondary" onClick={() => void resource.retry()}>{t('retry')}</Button></div> : <LoadingState />;
  if (!resource.data.monthly) return null;
  const foods = resource.data.foods.flatMap(row => row.budgetFood ? [row.budgetFood] : []);
  const day = pricedDay(meals, foods, swaps);
  const swapsAvailable = day.meals.flatMap(meal => meal.items.map(item => ({ item, swap: cheaperSwap(item, foods) })))
    .filter(candidate => candidate.swap && candidate.swap.saving >= 10).sort((a, b) => (b.swap?.saving ?? 0) - (a.swap?.saving ?? 0));
  const best = swapsAvailable[0];
  const name = (id: string, fallback: string) => locale === 'en' ? resource.data?.foods.find(food => food.id === id)?.name_en || fallback : fallback;
  return <section className="space-y-stack">
    <div className="flex flex-wrap items-center justify-between gap-stack"><BudgetPrice budget={resource.data.monthly} cost={day.costEgp} />
      <Link href="/player/nutrition/shopping" className={buttonClass({ variant: 'secondary' })}>{t('shopping')}</Link></div>
    {best?.swap && <div className="glass rounded-card p-card"><p className="text-xs text-muted">{t('cheaper')}</p>
      <p>{name(best.item.food.id, best.item.food.name)} <ChevronRight aria-hidden className="dir-icon inline size-4" /> {name(best.swap.food.id, best.swap.food.name)} · <bdi>{formatNumber(best.swap.grams, locale)} {t('grams')}</bdi></p>
      <p className="font-bold text-lime"><bdi>{t('saving', { n: formatNumber(best.swap.saving, locale) })}</bdi></p>
    </div>}
  </section>;
}

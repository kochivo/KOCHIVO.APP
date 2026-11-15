'use client';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { Utensils } from 'lucide-react';
import { EmptyState } from '@/ui/empty-state';
import { macrosFor, sumMacros } from '@/lib/macros';
import type { fetchPlayerPreview } from '../data/preview';
import { starterText } from '@/lib/starter-text';

type Preview = NonNullable<Awaited<ReturnType<typeof fetchPlayerPreview>>['data']>;
type Meal = NonNullable<Preview['nutrition']>['meals'][number];

// The preview never applies swaps, so it needs only the pure sums. Importing the nutrition
// feature here would pull the player's offline screen and its database into the captain bundle.
const itemMacros = (item: Meal['items'][number]) => macrosFor(item.per100g, item.grams);
const mealMacros = (meal: Meal) => sumMacros(meal.items.map(itemMacros));

export function PreviewNutrition({ nutrition }: Pick<Preview, 'nutrition'>) {
  const t = useT(messages);
  const locale = useLocale();
  const labels = { kcal: t('kcal'), protein: t('protein'), carbs: t('carbs'), fat: t('fat') } as const;
  if (!nutrition) return <EmptyState icon={Utensils} title={t('noNutrition')} body={t('emptyBody')} action={{ label: t('chooseTemplate'), href: '/captain/templates' }} />;
  const action = { label: t('editPlan'), href: `/captain/nutrition/${nutrition.plan_id}` };
  const total = sumMacros(nutrition.meals.map((meal) => mealMacros(meal)));
  return <section className="space-y-card-gap">
    <h2 className="text-xl font-bold">{starterText(nutrition.title, locale)}</h2>
    <dl className="glass-strong grid grid-cols-2 gap-stack rounded-card p-card">
      {Object.entries(labels).map(([key, label]) => {
        const macro = key as keyof typeof labels;
        return <div key={key}><dt className="text-xs text-muted">{label} · {t('totals')}</dt>
          <dd className="text-lg font-bold">{formatNumber(Math.round(total[macro]), locale)} / {nutrition.targets[macro] === null ? t('unspecified') : formatNumber(nutrition.targets[macro], locale)}</dd></div>;
      })}
    </dl>
    {nutrition.meals.length === 0 && <EmptyState icon={Utensils} title={t('noMeals')} body={t('emptyBody')} action={action} />}
    {nutrition.meals.map((meal) => {
      const macros = mealMacros(meal);
      return <section key={meal.id} className="glass space-y-stack rounded-card p-stack">
        <h3 className="font-bold">{starterText(meal.name, locale, nutrition.title)}</h3>
        <p className="text-sm text-muted">{t('macros', { kcal: formatNumber(Math.round(macros.kcal), locale), protein: formatNumber(Math.round(macros.protein), locale), carbs: formatNumber(Math.round(macros.carbs), locale), fat: formatNumber(Math.round(macros.fat), locale) })}</p>
        {meal.items.length === 0 && <EmptyState icon={Utensils} title={t('noItems')} body={t('emptyBody')} action={action} />}
        <ul className="space-y-inline">{meal.items.map((item) => <li key={item.id} className="border-t border-line pt-inline text-sm">
          {item.name} · {t('grams', { n: formatNumber(item.grams, locale) })}
          <p className="text-xs text-muted">{t('calories', { n: formatNumber(Math.round(itemMacros(item).kcal), locale) })}</p>
        </li>)}</ul>
      </section>;
    })}
  </section>;
}

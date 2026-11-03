'use client';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
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
  if (!nutrition) return <p className="text-muted">{t('noNutrition')}</p>;
  const total = sumMacros(nutrition.meals.map((meal) => mealMacros(meal)));
  return <section className="space-y-4">
    <h2 className="text-xl font-bold">{starterText(nutrition.title, locale)}</h2>
    <dl className="glass-strong grid grid-cols-2 gap-3 rounded-card p-4">
      {Object.entries(labels).map(([key, label]) => {
        const macro = key as keyof typeof labels;
        return <div key={key}><dt className="text-xs text-muted">{label} · {t('totals')}</dt>
          <dd className="text-lg font-bold">{formatNumber(Math.round(total[macro]), locale)} / {nutrition.targets[macro] === null ? t('unspecified') : formatNumber(nutrition.targets[macro], locale)}</dd></div>;
      })}
    </dl>
    {nutrition.meals.length === 0 && <p className="text-muted">{t('noMeals')}</p>}
    {nutrition.meals.map((meal) => {
      const macros = mealMacros(meal);
      return <section key={meal.id} className="glass space-y-3 rounded-card p-3">
        <h3 className="font-bold">{starterText(meal.name, locale)}</h3>
        <p className="text-sm text-muted">{t('macros', { kcal: formatNumber(Math.round(macros.kcal), locale), protein: formatNumber(Math.round(macros.protein), locale), carbs: formatNumber(Math.round(macros.carbs), locale), fat: formatNumber(Math.round(macros.fat), locale) })}</p>
        {meal.items.length === 0 && <p className="text-muted">{t('noItems')}</p>}
        <ul className="space-y-2">{meal.items.map((item) => <li key={item.id} className="border-t border-line pt-2 text-sm">
          {item.name} · {t('grams', { n: formatNumber(item.grams, locale) })}
          <p className="text-xs text-muted">{t('calories', { n: formatNumber(Math.round(itemMacros(item).kcal), locale) })}</p>
        </li>)}</ul>
      </section>;
    })}
  </section>;
}

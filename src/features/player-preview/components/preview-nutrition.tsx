'use client';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { itemMacros, mealMacros } from '@/features/nutrition';
import { sumMacros } from '@/lib/macros';
import type { fetchPlayerPreview } from '../data/preview';

type Preview = NonNullable<Awaited<ReturnType<typeof fetchPlayerPreview>>['data']>;

export function PreviewNutrition({ nutrition }: Pick<Preview, 'nutrition'>) {
  const t = useT(messages);
  const locale = useLocale();
  const labels = { kcal: t('kcal'), protein: t('protein'), carbs: t('carbs'), fat: t('fat') } as const;
  if (!nutrition) return <p className="text-muted">{t('noNutrition')}</p>;
  const total = sumMacros(nutrition.meals.map((meal) => mealMacros(meal, {})));
  return <section className="space-y-4">
    <h2 className="text-xl font-bold">{nutrition.title}</h2>
    <dl className="glass-strong grid grid-cols-2 gap-3 rounded-card p-4">
      {Object.entries(labels).map(([key, label]) => {
        const macro = key as keyof typeof labels;
        return <div key={key}><dt className="text-xs text-muted">{label} · {t('totals')}</dt>
          <dd className="text-lg font-bold">{formatNumber(Math.round(total[macro]), locale)} / {nutrition.targets[macro] === null ? t('unspecified') : formatNumber(nutrition.targets[macro], locale)}</dd></div>;
      })}
    </dl>
    {nutrition.meals.length === 0 && <p className="text-muted">{t('noMeals')}</p>}
    {nutrition.meals.map((meal) => {
      const macros = mealMacros(meal, {});
      return <section key={meal.id} className="glass space-y-3 rounded-card p-3">
        <h3 className="font-bold">{meal.name}</h3>
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

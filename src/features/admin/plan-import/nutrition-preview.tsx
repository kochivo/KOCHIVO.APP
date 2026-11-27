import { useT } from '@/core/i18n/client';
import { messages } from './messages';
import { conversionFoods, portionKey, portionName } from './import-review-model';
import type { NutritionSheet } from './nutrition-sheet';

export function NutritionPreview({ plan }: { plan: NutritionSheet }) {
  const t = useT(messages);
  const conversions = conversionFoods(plan);
  return <div className="space-y-card-gap">
    {plan.targets && <p className="font-semibold text-ink">{t('targets', plan.targets)}</p>}
    {plan.water !== null && <p className="text-sm text-muted">{t('waterTarget', { n: plan.water })}</p>}
    {plan.invalidWater && <p className="text-warn">{t('water')}</p>}
    {conversions.map(food => <label key={portionKey(food)} className="grid gap-inline">
      {t('conversion', { name: portionName(food) })}
      <input className="min-h-12 max-w-full rounded-control border border-line bg-surface px-stack"
        name={portionKey(food)} required type="number" min={0.1} max={1000} step={0.01} />
    </label>)}
    {plan.meals.map((meal, index) => <section key={index} className="recessed space-y-stack rounded-card p-card">
      <h2 className="text-title font-semibold">{meal.name}</h2>
      <ul className="divide-y divide-line">
        {meal.items.map((row, position) => <li key={position} className="flex flex-wrap items-baseline justify-between gap-inline py-stack">
          <span className="break-words">{portionName(row)}</span>
          <span className="text-sm text-muted"><bdi>{row.amount} {t(row.unit === 'g' ? 'grams' : row.unit)}</bdi>
            {' · '}{t('macros', row)}</span>
        </li>)}
      </ul>
    </section>)}
  </div>;
}

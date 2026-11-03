import { itemMacros, mealMacros } from '@/features/nutrition';
import { sumMacros } from '@/lib/macros';
import type { fetchPlayerPreview } from '../data/preview';

type Preview = NonNullable<Awaited<ReturnType<typeof fetchPlayerPreview>>['data']>;
const labels = { kcal: 'سعرة', protein: 'بروتين', carbs: 'كارب', fat: 'دهون' } as const;

export function PreviewNutrition({ nutrition }: Pick<Preview, 'nutrition'>) {
  if (!nutrition) return <p className="text-muted">لسه مفيش نظام أكل متفعل</p>;
  const total = sumMacros(nutrition.meals.map((meal) => mealMacros(meal, {})));
  return <section className="space-y-4">
    <h2 className="text-xl font-bold">{nutrition.title}</h2>
    <dl className="glass-strong grid grid-cols-2 gap-3 rounded-card p-4">
      {Object.entries(labels).map(([key, label]) => {
        const macro = key as keyof typeof labels;
        return <div key={key}><dt className="text-xs text-muted">{label} · الإجمالي / الهدف</dt>
          <dd className="text-lg font-bold">{Math.round(total[macro])} / {nutrition.targets[macro] ?? 'مش متحدد'}</dd></div>;
      })}
    </dl>
    {nutrition.meals.length === 0 && <p className="text-muted">لسه مفيش وجبات في النظام</p>}
    {nutrition.meals.map((meal) => {
      const macros = mealMacros(meal, {});
      return <section key={meal.id} className="glass space-y-3 rounded-card p-3">
        <h3 className="font-bold">{meal.name}</h3>
        <p className="text-sm text-muted">{Math.round(macros.kcal)} سعرة · {Math.round(macros.protein)} بروتين · {Math.round(macros.carbs)} كارب · {Math.round(macros.fat)} دهون</p>
        {meal.items.length === 0 && <p className="text-muted">لسه مفيش أصناف في الوجبة</p>}
        <ul className="space-y-2">{meal.items.map((item) => <li key={item.id} className="border-t border-line pt-2 text-sm">
          {item.name} · {item.grams} جم
          <p className="text-xs text-muted">{Math.round(itemMacros(item).kcal)} سعرة</p>
        </li>)}</ul>
      </section>;
    })}
  </section>;
}

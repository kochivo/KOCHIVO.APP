import { useT } from '@/core/i18n/client';
import { GlassCard } from '@/ui/glass-card';
import { Button } from '@/ui/button';
import { ProgressBar } from '@/ui/progress-bar';
import { mealCalories, mealPlanCalories } from './meal-calories';
import { guidedMessages } from './messages';
import type { PaneProps } from './types';
import { FoodRow } from './food-row';

export function Meals({ state, act }: PaneProps) {
  const t = useT(guidedMessages), foods = t('foods').split('|');
  const meals = [[foods[0], foods[1], foods[2]], [foods[3], t('alternatives').split('|')[state.swap], foods[4]], [foods[5], foods[6]], [foods[7], foods[8]]];
  return <div className="grid gap-card-gap min-[1200px]:grid-cols-2"><GlassCard className="grid gap-stack p-card"><h3 className="text-md font-semibold">{t('foodTitle')} · {t('calories', { n: mealPlanCalories })}</h3>
    {meals.map((foods, i) => <section key={i} className="grid gap-stack"><h4 className="flex justify-between text-sm font-semibold">{t('meals').split('|')[i]}<small className="text-muted">{t('calories', { n: mealCalories[i] ?? 0 })}</small></h4>
      <ul>{foods.map((food, j) => <FoodRow key={j} name={food ?? ''}>{i === 1 && j === 1 && <Button variant="secondary" data-demo-target="swap" onClick={() => act('swap')}>{t('swap')}</Button>}</FoodRow>)}</ul>
    </section>)}
  </GlassCard><GlassCard className="grid content-start gap-stack p-card"><h3>{t('macros')}</h3>{t('macroNames').split('|').map((name, i) => <div key={name} className="grid gap-stack"><div className="flex justify-between text-sm"><span>{name}</span><b dir="ltr">{t('grams', { n: [170, 250, 63][i] ?? 0 })}</b></div><ProgressBar value={[170, 250, 63][i] ?? 0} max={[200, 300, 90][i] ?? 1} aria-label={name} /></div>)}<p className="text-xs text-muted">{t('swapDetail')}</p>{state.swap > 0 && <p className="rounded-control bg-lime-soft p-stack text-sm">{t('alternatives').split('|')[state.swap]}</p>}</GlassCard></div>;
}

'use client';

import { IconButton } from '@/ui/icon-button';
import { EditInPlace } from '@/ui/edit-in-place';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { Ellipsis } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { uuidv7 } from '@/core/offline/ids';
import type { PlayerFacts } from '@/features/player-file';
import { formatNumber } from '@/lib/format';
import { addItem, renameMeal } from '../../draft';
import { nutritionTotals } from './nutrition-values';
import type { Meal, PlanDraft } from '../../types';
import { FoodRow } from './food-row';
import { FoodSearch } from './food-search';
import { messages } from './workspace/messages';
import { messages as planMessages } from '../../messages';
import { useToast } from '@/ui/toast';
import { messages as successMessages } from '../../success/messages';
import type { TimedMeal } from '../../data/meal-portions';
import { MealMenu } from './meal-menu';
import { messages as redesignMessages } from './redesign/messages';
import { messages as macroMessages } from '../v11/messages';

const MealEditor = dynamic(() => import('../meal-editor').then(module => module.MealEditor));

export function MealCard({ meal, update, facts, day, first, last, editableName = false }: {
  meal: Meal; update: (change: (draft: PlanDraft) => PlanDraft) => void;
  facts: PlayerFacts; day: 'training' | 'rest'; first: boolean; last: boolean;
  editableName?: boolean;
}) {
  const t = useT(messages);
  const planT = useT(planMessages);
  const rt = useT(redesignMessages);
  const macroT = useT(macroMessages);
  const locale = useLocale();
  const success = useT(successMessages), toast = useToast();
  const [details, setDetails] = useState(false);
  const { totals, incomplete } = nutritionTotals([meal]);
  return <section className="glass mb-3 min-w-0 rounded-card border border-line-soft">
    <div className="flex flex-wrap items-center gap-2.5 px-[18px] py-3.5">
      {editableName ? <div className="min-w-0 flex-1"><EditInPlace label={planT('mealName')} value={meal.name} maxLength={40}
        // meals.name must be 1-40 characters, or the autosave is rejected.
        onChange={event => { const name = event.target.value.slice(0, 40); if (name.trim()) update(draft => renameMeal(draft, meal.id, name)); }}
        className="font-display text-[19px] font-semibold" /></div> : <h2 className="font-display text-[19px] font-semibold">{meal.name}</h2>}
      <span className="ms-auto text-xs text-muted">{macroT('calories', { n: formatNumber(Math.round(totals.kcal), locale) })}<small className="block">{macroT('macros', { p: formatNumber(totals.protein, locale), c: formatNumber(totals.carbs, locale), f: formatNumber(totals.fat, locale) })}</small></span>
      <label className="rounded-full border border-line bg-surface px-2"><span className="sr-only">{rt('time')}</span><input type="time" value={(meal as TimedMeal).timeOfDay?.slice(0, 5) ?? ''} onChange={event => update(draft => ({ ...draft, meals: draft.meals.map(row => row.id === meal.id ? { ...row, timeOfDay: event.target.value || null } : row) }))} className="press min-h-12 max-w-32 cursor-pointer rounded-control bg-transparent text-xs focus-visible:ring-2 focus-visible:ring-lime" /></label>
      <MealMenu meal={meal} day={day} update={update} rename={() => setDetails(true)} />
      {incomplete && <span className="text-xs text-warn">{t('incomplete')}</span>}
      <IconButton type="button" aria-label={t('details')} aria-expanded={details} onClick={() => setDetails(!details)} className="grid min-h-12 min-w-12 place-items-center text-ink"><Ellipsis aria-hidden className="size-4" /></IconButton>
    </div>
    {!meal.items.length && <p className="px-[18px] pb-3 text-xs text-faint">{planT('addTheFirstFood')}</p>}
    <ul className="@container">{meal.items.map(item => <FoodRow key={item.id} item={item} update={update} />)}</ul>
    <FoodSearch meal={meal.name} onPick={(food, grams, unit) => {
      const id = uuidv7();
      update(draft => { const next = addItem(draft, meal.id, food, grams, id, planT); return { ...next, meals: next.meals.map(meal => ({ ...meal, items: meal.items.map(item => item.id === id ? { ...item, unit: unit ?? null } : item) })) }; });
      toast.success({ title: success('added'), detail: success('foodDetail', { name: locale === 'en' ? food.nameEn || food.name : food.name, grams: formatNumber(grams, locale) }), icon: 'meal' });
    }} />
    {details && <MealEditor meal={meal} update={update} facts={facts} enhanced day={day} first={first} last={last} hideAdd />}
  </section>;
}

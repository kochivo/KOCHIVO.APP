'use client';

import { EditInPlace } from '@/ui/edit-in-place';
import { IconButton } from '@/ui/icon-button';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { DisclosureChevron } from '@/ui/disclosure-chevron';
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
import { MealTimeField } from '../meal-time-field';
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
  return <section className="glass mb-stack min-w-0 rounded-card border border-line-soft">
    <div className="grid grid-cols-[minmax(0,1fr)_48px_48px] items-center gap-stack px-page-x py-card">
      {editableName ? <div className="col-span-full min-w-0"><EditInPlace label={planT('mealName')} value={meal.name} maxLength={40}
        // meals.name must be 1-40 characters, or the autosave is rejected.
        onChange={event => { const name = event.target.value.slice(0, 40); if (name.trim()) update(draft => renameMeal(draft, meal.id, name)); }}
        className="min-w-0 font-display text-title font-semibold" /></div> : <h2 className="col-span-full min-w-0 break-words font-display text-title font-semibold">{meal.name}</h2>}
      <span className="col-span-full min-w-0 text-xs text-muted">{macroT('calories', { n: formatNumber(Math.round(totals.kcal), locale) })}<small className="block">{macroT('macros', { p: formatNumber(totals.protein, locale), c: formatNumber(totals.carbs, locale), f: formatNumber(totals.fat, locale) })}</small></span>
      <MealTimeField label={rt('time')} value={(meal as TimedMeal).timeOfDay?.slice(0, 5) ?? ''} onChange={timeOfDay => update(draft => ({ ...draft, meals: draft.meals.map(row => row.id === meal.id ? { ...row, timeOfDay } : row) }))} />
      <MealMenu meal={meal} day={day} update={update} rename={() => setDetails(true)} />
      <IconButton type="button" aria-label={t('details')} aria-expanded={details} onClick={() => setDetails(!details)} className="grid min-h-12 min-w-12 place-items-center text-ink"><DisclosureChevron expanded={details} className="size-4" /></IconButton>
      {incomplete && <span className="col-span-full text-xs text-warn">{t('incomplete')}</span>}
    </div>
    {!meal.items.length && <p className="px-page-x pb-stack text-xs text-faint">{planT('addTheFirstFood')}</p>}
    <ul className="@container">{meal.items.map(item => <FoodRow key={item.id} item={item} update={update} />)}</ul>
    <FoodSearch meal={meal.name} onPick={(food, grams, unit) => {
      const id = uuidv7();
      update(draft => { const next = addItem(draft, meal.id, food, grams, id, planT); return { ...next, meals: next.meals.map(meal => ({ ...meal, items: meal.items.map(item => item.id === id ? { ...item, unit: unit ?? null } : item) })) }; });
      toast.success({ title: success('added'), detail: success('foodDetail', { name: locale === 'en' ? food.nameEn || food.name : food.name, grams: formatNumber(grams, locale) }), icon: 'meal' });
    }} />
    {details && <MealEditor meal={meal} update={update} facts={facts} enhanced day={day} first={first} last={last} hideAdd />}
  </section>;
}

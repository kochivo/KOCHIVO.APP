'use client';
import { editableFieldClass, EditInPlace } from '@/ui/edit-in-place';
import { useRef, useState } from 'react';
import { KoPlus as Plus } from '@/ui/icons/ko-plus';
import { useT } from '@/core/i18n/client';
import { uuidv7 } from '@/core/offline/ids';

import { Button } from '@/ui/button';
import { DisclosureChevron } from '@/ui/disclosure-chevron';
import type { Meal, PlanDraft } from '../types';
import type { TimedMeal } from '../data/meal-portions';
import { defaultPortion } from '../data/meal-portions';
import { addItem, renameMeal } from '../draft';
import { mealTotals } from '../totals';
import { V11FoodRow } from './v11-food-row';
import { V11FoodPicker } from './v11-food-picker';
import { MealMenu } from './editor/meal-menu';
import { messages } from './v11/messages';
import { messages as redesignMessages } from './editor/redesign/messages';

export function V11Meal({ meal, day, update }: { meal: Meal; day: 'training' | 'rest'; update: (change: (draft: PlanDraft) => PlanDraft) => void }) {
  const t = useT(messages), rt = useT(redesignMessages);
  const [search, setSearch] = useState(false), name = useRef<HTMLDivElement>(null);
  const totals = mealTotals(meal);
  return <section className="glass min-w-0 rounded-card border border-line-soft p-4">
    <div className="flex flex-wrap items-center gap-2">
      <div ref={name} className="max-w-48"><EditInPlace label={rt('rename')} value={meal.name} maxLength={40} onChange={event => update(draft => renameMeal(draft, meal.id, event.target.value))} /></div>
      <label className="recessed rounded-full border border-line px-3"><span className="sr-only">{rt('time')}</span><input type="time" value={(meal as TimedMeal).timeOfDay?.slice(0, 5) ?? ''} onChange={event => update(draft => ({ ...draft, meals: draft.meals.map(row => row.id === meal.id ? { ...row, timeOfDay: event.target.value || null } : row) }))} className={`${editableFieldClass} press min-h-12 max-w-32 cursor-pointer rounded-control bg-surface text-xs focus-visible:ring-2 focus-visible:ring-lime`} /></label>
      <div className="ms-auto text-xs"><b>{t('calories', { n: totals.kcal })}</b><p className="text-muted">{t('macros', { p: totals.protein, c: totals.carbs, f: totals.fat })}</p></div>
      <MealMenu meal={meal} day={day} update={update} rename={() => name.current?.querySelector('input')?.focus()} />
    </div>
    {!meal.items.length && <p className="py-3 text-xs text-muted">{t('empty')}</p>}
    <ul>{meal.items.map(item => <V11FoodRow key={item.id} item={item} update={update} />)}</ul>
    <Button variant="secondary" aria-expanded={search} onClick={() => setSearch(!search)} className="mt-3 w-full border border-dashed border-lime/40 text-lime"><Plus aria-hidden className="size-4" />{rt('addTo', { meal: meal.name })}<DisclosureChevron expanded={search} /></Button>
    {search && <V11FoodPicker inline disabled={false} onPick={food => {
      const portion = defaultPortion(food), id = uuidv7();
      update(draft => { const next = addItem(draft, meal.id, food, portion.grams, id); return { ...next, meals: next.meals.map(row => ({ ...row, items: row.items.map(item => item.id === id ? { ...item, unit: portion.unit } : item) })) }; });
      setSearch(false);
    }} />}
  </section>;
}

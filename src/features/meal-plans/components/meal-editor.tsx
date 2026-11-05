'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';
import { useId, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowDown, ArrowUp, Trash2, Utensils } from 'lucide-react';
import { Button, EmptyState } from '@/ui';
import { uuidv7 } from '@/core/offline/ids';
import { addItem, moveMeal, removeMeal, renameMeal } from '../draft';
import { mealTotals } from '../totals';
import { ItemRow } from './item-row';
import { FoodPicker } from './food-picker';
import type { Meal, PlanDraft } from '../types';

const CustomFoodSheet = dynamic(() => import('./custom-food-sheet').then(module => module.CustomFoodSheet));

export function MealEditor({ meal, first, last, update }: { meal: Meal; first: boolean; last: boolean; update: (change: (draft: PlanDraft) => PlanDraft) => void }) {
  const t = useT(messages);
  const locale = useLocale();
  const [picking, setPicking] = useState(false);
  const [creating, setCreating] = useState(false);
  const openerId = useId();
  return <section aria-label={meal.name || t('meal')} className="glass grid gap-4 rounded-card p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label>{t('mealName')}<input value={meal.name} maxLength={40} onChange={event => update(d => renameMeal(d, meal.id, event.target.value))}
        className="ms-2 min-h-12 rounded-control bg-surface px-3" /></label>
      <div className="flex gap-1">
        <Button variant="ghost" disabled={first} aria-label={t('moveMealUp')} onClick={() => update(d => moveMeal(d, meal.id, -1))}><ArrowUp aria-hidden className="dir-icon" /></Button>
        <Button variant="ghost" disabled={last} aria-label={t('moveMealDown')} onClick={() => update(d => moveMeal(d, meal.id, 1))}><ArrowDown aria-hidden className="dir-icon" /></Button>
        <Button variant="ghost" aria-label={t('deleteMeal')} onClick={() => update(d => removeMeal(d, meal.id))}><Trash2 aria-hidden /></Button>
      </div>
    </div>
    <p className="text-muted">{formatNumber(mealTotals(meal).kcal, locale)}  {t('kcal')}</p>
    {!meal.items.length && !picking && <EmptyState icon={Utensils} title={t('addTheFirstFood')} body={t('emptyBody')}
      action={{ label: t('addFood'), onClick: () => setPicking(true) }} />}
    <ul className="grid gap-3">{meal.items.map((item, index) => <ItemRow key={item.id} item={item} first={index === 0} last={index === meal.items.length - 1} update={update} />)}</ul>
    <div className="flex flex-wrap gap-2">
      {(meal.items.length > 0 || picking) && <Button variant="secondary" onClick={() => setPicking(!picking)}>{picking ? t('closeSearch') : t('addFood')}</Button>}
      <Button id={openerId} variant="secondary" onClick={() => setCreating(true)}>{t('newFood')}</Button>
    </div>
    {creating && <CustomFoodSheet openerId={openerId} onClose={() => setCreating(false)} onSave={(food, grams) => {
      const id = uuidv7(); update(d => addItem(d, meal.id, food, grams, id, t)); setCreating(false); setPicking(false);
    }} />}
    {picking && <FoodPicker onPick={(food, grams) => { const id = uuidv7(); update(d => addItem(d, meal.id, food, grams, id, t)); setPicking(false); }} />}
  </section>;
}

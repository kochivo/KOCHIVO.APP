'use client';
import { useState } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { Button } from '@/ui';
import { uuidv7 } from '@/core/offline/ids';
import { addItem, moveMeal, removeMeal, renameMeal } from '../draft';
import { mealTotals } from '../totals';
import { ItemRow } from './item-row';
import { FoodPicker } from './food-picker';
import type { Meal, PlanDraft } from '../types';

export function MealEditor({ meal, first, last, update }: { meal: Meal; first: boolean; last: boolean; update: (change: (draft: PlanDraft) => PlanDraft) => void }) {
  const [picking, setPicking] = useState(false);
  return <section aria-label={meal.name || 'وجبة'} className="glass grid gap-4 rounded-card p-4">
    <div className="flex flex-wrap items-center justify-between gap-2">
      <label>اسم الوجبة<input value={meal.name} maxLength={40} onChange={event => update(d => renameMeal(d, meal.id, event.target.value))}
        className="ms-2 min-h-12 rounded-control bg-surface px-3" /></label>
      <div className="flex gap-1">
        <Button variant="ghost" disabled={first} aria-label="طلّع الوجبة" onClick={() => update(d => moveMeal(d, meal.id, -1))}><ArrowUp aria-hidden /></Button>
        <Button variant="ghost" disabled={last} aria-label="نزّل الوجبة" onClick={() => update(d => moveMeal(d, meal.id, 1))}><ArrowDown aria-hidden /></Button>
        <Button variant="ghost" aria-label="امسح الوجبة" onClick={() => update(d => removeMeal(d, meal.id))}><Trash2 aria-hidden /></Button>
      </div>
    </div>
    <p className="text-muted">{mealTotals(meal).kcal} سعرة</p>
    {!meal.items.length && <p>ضيف أول أكلة</p>}
    <ul className="grid gap-3">{meal.items.map((item, index) => <ItemRow key={item.id} item={item} first={index === 0} last={index === meal.items.length - 1} update={update} />)}</ul>
    <Button variant="secondary" onClick={() => setPicking(!picking)}>{picking ? 'اقفل البحث' : 'ضيف أكلة'}</Button>
    {picking && <FoodPicker onPick={(food, grams) => { const id = uuidv7(); update(d => addItem(d, meal.id, food, grams, id)); setPicking(false); }} />}
  </section>;
}

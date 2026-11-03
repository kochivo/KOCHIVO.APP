'use client';
import { useState } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { Button, Stepper } from '@/ui';
import { uuidv7 } from '@/core/offline/ids';
import { macrosFor } from '@/lib/macros';
import { addAlternative, moveItem, removeAlternative, removeItem, setGrams } from '../draft';
import { FoodPicker } from './food-picker';
import type { MealItem, PlanDraft } from '../types';

export function ItemRow({ item, first, last, update }: { item: MealItem; first: boolean; last: boolean; update: (change: (draft: PlanDraft) => PlanDraft) => void }) {
  const [expanded, setExpanded] = useState(false);
  const [picking, setPicking] = useState(false);
  const macros = macrosFor(item.food, item.grams);
  return <li className="glass-strong grid gap-3 rounded-card p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{item.food.name}</h3>
      <div className="flex gap-1">
        <Button variant="ghost" disabled={first} aria-label="طلّع الأكلة" onClick={() => update(d => moveItem(d, item.id, -1))}><ArrowUp aria-hidden /></Button>
        <Button variant="ghost" disabled={last} aria-label="نزّل الأكلة" onClick={() => update(d => moveItem(d, item.id, 1))}><ArrowDown aria-hidden /></Button>
        <Button variant="ghost" aria-label="امسح الأكلة" onClick={() => update(d => removeItem(d, item.id))}><Trash2 aria-hidden /></Button>
      </div>
    </div>
    <Stepper label={`جرامات ${item.food.name}`} min={5} step={5} value={item.grams}
      onChange={grams => update(d => setGrams(d, item.id, Math.min(2000, grams)))} format={value => `${value}ج`} />
    <p className="text-sm text-muted">{macros.kcal} سعرة · بروتين {macros.protein} · كارب {macros.carbs} · دهون {macros.fat}</p>
    <Button variant="secondary" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>بدائل</Button>
    {expanded && <div className="grid gap-2">
      {!item.alternatives.length && <p className="text-muted">مفيش بدائل لسه</p>}
      <ul>{item.alternatives.map(alt => <li key={alt.id} className="flex items-center justify-between gap-2">
        <span>{alt.food.name} · {alt.grams}ج = نفس السعرات</span>
        <Button variant="ghost" aria-label={`امسح بديل ${alt.food.name}`} onClick={() => update(d => removeAlternative(d, item.id, alt.id))}><Trash2 aria-hidden /></Button>
      </li>)}</ul>
      <Button variant="secondary" onClick={() => setPicking(!picking)}>{picking ? 'اقفل البحث' : 'ضيف بديل'}</Button>
      {picking && <FoodPicker alternative onPick={food => { const id = uuidv7(); update(d => addAlternative(d, item.id, food, id)); setPicking(false); }} />}
    </div>}
  </li>;
}

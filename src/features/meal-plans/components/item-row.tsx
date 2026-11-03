'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';
import { useState } from 'react';
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react';
import { Button, Stepper } from '@/ui';
import { uuidv7 } from '@/core/offline/ids';
import { macrosFor } from '@/lib/macros';
import { addAlternative, moveItem, removeAlternative, removeItem, setGrams } from '../draft';
import { FoodPicker } from './food-picker';
import type { MealItem, PlanDraft } from '../types';

export function ItemRow({ item, first, last, update }: { item: MealItem; first: boolean; last: boolean; update: (change: (draft: PlanDraft) => PlanDraft) => void }) {
  const t = useT(messages);
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const [picking, setPicking] = useState(false);
  const macros = macrosFor(item.food, item.grams);
  return <li className="glass-strong grid gap-3 rounded-card p-4">
    <div className="flex flex-wrap items-center justify-between gap-2"><h3 className="font-bold">{item.food.name}</h3>
      <div className="flex gap-1">
        <Button variant="ghost" disabled={first} aria-label={t('moveFoodUp')} onClick={() => update(d => moveItem(d, item.id, -1))}><ArrowUp aria-hidden className="dir-icon" /></Button>
        <Button variant="ghost" disabled={last} aria-label={t('moveFoodDown')} onClick={() => update(d => moveItem(d, item.id, 1))}><ArrowDown aria-hidden className="dir-icon" /></Button>
        <Button variant="ghost" aria-label={t('deleteFood')} onClick={() => update(d => removeItem(d, item.id))}><Trash2 aria-hidden /></Button>
      </div>
    </div>
    <Stepper label={t('gramsOf', { v0: item.food.name })} min={5} step={5} value={item.grams}
      onChange={grams => update(d => setGrams(d, item.id, Math.min(2000, grams), t))} format={value => t('g', { v0: formatNumber(value, locale) })} />
    <p className="text-sm text-muted">{formatNumber(macros.kcal, locale)}  {t('kcalProtein')} {formatNumber(macros.protein, locale)}  {t('carbs')} {formatNumber(macros.carbs, locale)}  {t('fat')} {formatNumber(macros.fat, locale)}</p>
    <Button variant="secondary" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{t('alternatives')}</Button>
    {expanded && <div className="grid gap-2">
      {!item.alternatives.length && <p className="text-muted">{t('noAlternativesYet')}</p>}
      <ul>{item.alternatives.map(alt => <li key={alt.id} className="flex items-center justify-between gap-2">
        <span>{alt.food.name} · {formatNumber(alt.grams, locale)}{t('gSameCalories')}</span>
        <Button variant="ghost" aria-label={t('deleteAlternative', { v0: alt.food.name })} onClick={() => update(d => removeAlternative(d, item.id, alt.id))}><Trash2 aria-hidden /></Button>
      </li>)}</ul>
      <Button variant="secondary" onClick={() => setPicking(!picking)}>{picking ? t('closeSearch') : t('addAlternative')}</Button>
      {picking && <FoodPicker alternative onPick={food => { const id = uuidv7(); update(d => addAlternative(d, item.id, food, id)); setPicking(false); }} />}
    </div>}
  </li>;
}

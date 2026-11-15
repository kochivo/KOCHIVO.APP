'use client';

import { secondaryButtonClass } from '@/ui/secondary-button-class';
import { editableFieldClass } from '@/ui/edit-in-place';
import { IconButton } from '@/ui/icon-button';
import { useId, useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, X } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { macrosFor } from '@/lib/macros';
import { unitGrams, unitQuantity } from '../../editor-rules';
import { removeItem, setGrams } from '../../draft';
import type { MealItem, PlanDraft } from '../../types';
import { messages } from './workspace/messages';
import { messages as planMessages } from '../../messages';
import { foodPhotoUrl } from '@/core/storage/media-url';
import { missingNutrition } from './nutrition-values';
import type { PortionItem } from '../../data/meal-portions';
import { Button } from '@/ui/button';
import { messages as redesignMessages } from './redesign/messages';
import { messages as macroMessages } from '../v11/messages';

const CustomFoodSheet = dynamic(() => import('../custom-food-sheet').then(module => module.CustomFoodSheet));
const AlternativesSheet = dynamic(() => import('./alternatives-sheet').then(module => module.AlternativesSheet));

export function FoodRow({ item, update }: { item: MealItem; update: (change: (draft: PlanDraft) => PlanDraft) => void }) {
  const t = useT(messages);
  const planT = useT(planMessages);
  const locale = useLocale();
  const macroT = useT(macroMessages);
  const key = (item as PortionItem).unit ?? '';
  const [alternatives, setAlternatives] = useState(false);
  const rt = useT(redesignMessages), alternativeId = useId();
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const openerId = useId();
  const [edited, setEdited] = useState<{ grams: number; key: string; text: string } | null>(null);
  const unit = item.food.units?.find(value => value.key === key);
  const unitName = unit ? t('unitLabel', { name: locale === 'en' ? unit.name_en : unit.name_ar, grams: formatNumber(unit.grams, locale) }) : t('gramUnit');
  const name = locale === 'en' ? item.food.nameEn || item.food.name : item.food.name;
  const missing = missingNutrition(item.food);
  return <li data-incomplete={missing} className={`grid grid-cols-[minmax(0,1fr)_auto_48px] items-center gap-inline border-t border-line-soft p-stack text-row @[36rem]:grid-cols-[40px_minmax(8rem,1fr)_minmax(150px,190px)_64px_48px] @[36rem]:gap-stack ${missing ? 'bg-warn/10' : ''}`}>
    <span className="hidden size-10 overflow-hidden rounded-xl border border-line bg-surface @[36rem]:block">
      {/* Food storage hosts vary by deployment. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {item.food.photo && <img src={foodPhotoUrl(item.food.photo)} alt="" width={40} height={40} loading="lazy" className="size-10 object-cover" />}
    </span>
    <div className="col-span-full min-w-0 break-words @[36rem]:col-span-1">{name}{missing ? <small className="block text-micro text-warn">{t('missingValues')} · {item.food.custom && <button id={openerId} type="button" className={`${secondaryButtonClass} min-h-12 underline`} onClick={() => setEditing(true)}>{t('complete')}</button>} {t('countHint')}</small>
      : <small className="block whitespace-nowrap text-xs text-muted">{macroT('macros', { p: formatNumber(macrosFor(item.food, item.grams).protein, locale), c: formatNumber(macrosFor(item.food, item.grams).carbs, locale), f: formatNumber(macrosFor(item.food, item.grams).fat, locale) })}</small>}</div>
    <div className="flex min-h-12 min-w-0 flex-wrap items-center rounded-xl border border-line">
      <input type="number" aria-label={t('quantity', { name })} min={5 / (unit?.grams ?? 1)} max={2000 / (unit?.grams ?? 1)} step="any"
        value={edited?.grams === item.grams && edited.key === key ? edited.text : Math.round(unitQuantity(item.grams, unit) * 100) / 100}
        onChange={event => {
          const text = event.target.value;
          try {
            const grams = unitGrams(event.target.valueAsNumber, unit);
            if (grams < 5 || grams > 2000) throw new RangeError('Invalid amount');
            update(draft => setGrams(draft, item.id, grams, planT)); setEdited({ grams, key, text }); setError('');
          } catch { setEdited({ grams: item.grams, key, text }); setError(planT('amountMustBe5To2000Grams')); }
        }} className={`${editableFieldClass} min-h-12 w-14 shrink-0 bg-surface text-center font-display font-extrabold tabular-nums`} />
      <span className="relative flex min-h-12 min-w-0 flex-1 items-center border-s border-line px-inline text-xs text-muted">
        <span className="whitespace-normal break-words">{unitName}</span>
        {!!item.food.units?.length && <ChevronDown aria-hidden className="ms-auto size-3 shrink-0" />}
        {!!item.food.units?.length && <select aria-label={t('unit')} value={key} onChange={event => { const unit = event.target.value || null; update(draft => ({ ...draft, meals: draft.meals.map(meal => ({ ...meal, items: meal.items.map(row => row.id === item.id ? { ...row, unit } : row) })) })); }} className={`${editableFieldClass} absolute inset-0 min-h-12 w-full cursor-pointer opacity-0 focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-lime`}>
          <option value="">{t('gramUnit')}</option>{item.food.units.map(value => <option key={value.key} value={value.key}>{t('unitLabel', { name: locale === 'en' ? value.name_en : value.name_ar, grams: formatNumber(value.grams, locale) })}</option>)}
        </select>}
      </span>
    </div>
    <span className={`font-display font-extrabold tabular-nums ${missing ? 'text-warn' : ''}`}>{missing ? t('unknown') : formatNumber(Math.round(macrosFor(item.food, item.grams).kcal), locale)}{!missing && <small className="block text-micro font-normal text-muted">{t('calorieUnit')}</small>}</span>
    <IconButton type="button" aria-label={t('remove', { name })} className="border border-danger/40 text-danger! grid min-h-12 min-w-12 place-items-center text-ink" onClick={() => update(draft => removeItem(draft, item.id))}><X aria-hidden className="size-4" /></IconButton>
    {error && <p role="alert" className="col-span-full text-danger">{error}</p>}
    <div className="col-span-full"><Button id={alternativeId} variant="secondary" block={false} onClick={() => setAlternatives(true)}>{rt('alternatives', { n: item.alternatives.length })}</Button></div>
    {alternatives && <AlternativesSheet item={item} update={update} openerId={alternativeId} onClose={() => setAlternatives(false)} />}
    {editing && <CustomFoodSheet food={item.food} openerId={openerId} onClose={() => setEditing(false)} onSave={food => {
      update(draft => ({ ...draft, meals: draft.meals.map(meal => ({ ...meal, items: meal.items.map(row => ({ ...row,
        food: row.food.id === food.id ? food : row.food,
        alternatives: row.alternatives.map(alt => alt.food.id === food.id ? { ...alt, food } : alt),
      })) })) })); setEditing(false);
    }} />}
  </li>;
}

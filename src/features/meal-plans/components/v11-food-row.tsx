'use client';
import { editableFieldClass } from '@/ui/edit-in-place';
import { useId, useState } from 'react';
import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { foodPhotoUrl } from '@/core/storage/media-url';
import { macrosFor } from '@/lib/macros';
import type { MealItem, PlanDraft } from '../types';
import { removeItem, setGrams } from '../draft';
import { messages } from './v11/messages';
import { messages as planMessages } from '../messages';
import { messages as redesignMessages } from './editor/redesign/messages';
import { portionGrams, setPortionUnit, unitGrams } from '../data/meal-portions';
import type { PortionItem } from '../data/meal-portions';
import { Button } from '@/ui/button';
import { IconButton } from '@/ui/icon-button';

const AlternativesSheet = dynamic(() => import('./editor/alternatives-sheet').then(module => module.AlternativesSheet));

export function V11FoodRow({ item, update }: { item: MealItem; update: (change: (draft: PlanDraft) => PlanDraft) => void }) {
  const t = useT(messages), pt = useT(planMessages), locale = useLocale();
  const [error, setError] = useState('');
  const [alternatives, setAlternatives] = useState(false), openerId = useId();
  const rt = useT(redesignMessages);
  const unit = (item as PortionItem).unit ?? null;
  const validUnit = item.food.units?.some(value => value.key === unit) ? unit : null;
  const factor = unitGrams(item.food, validUnit);
  const values = macrosFor(item.food, item.grams);
  return <li className="flex min-w-0 flex-wrap items-center gap-2 border-t border-line-soft px-4 py-2.5 text-xs">
    <span className="size-9 shrink-0 overflow-hidden rounded-lg bg-surface">
      {/* Food storage hosts vary by deployment. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {item.food.photo && <img src={foodPhotoUrl(item.food.photo)} alt="" width={36} height={36} loading="lazy" className="size-9 object-cover" />}
    </span>
    <div className="min-w-0 flex-1"><b>{locale === 'en' ? item.food.nameEn || item.food.name : item.food.name}</b><p className="mt-1 text-muted">{t('grams', { n: item.grams })} · {t('macros', { p: values.protein, c: values.carbs, f: values.fat })}</p></div>
    <input type="number" aria-label={pt('gramsOf', { v0: item.food.name })} min={5 / factor} max={2000 / factor} step="any" value={Number((item.grams / factor).toFixed(4))} onChange={event => {
      const amount = event.target.valueAsNumber;
      const grams = Number.isFinite(amount) && amount >= 0 ? portionGrams(item.food, amount, validUnit) : NaN;
      if (!Number.isFinite(grams) || grams < 5 || grams > 2000) { setError(pt('amountMustBe5To2000Grams')); return; }
      setError(''); update(draft => setGrams(draft, item.id, grams, pt));
    }} className={`${editableFieldClass} min-h-12 w-14 rounded-lg border border-line bg-surface text-center tabular-nums`} />
    <select aria-label={t('unit')} value={validUnit ?? ''} onChange={event => {
      const nextUnit = event.target.value || null;
      update(draft => setPortionUnit(draft, item.id, nextUnit));
    }} className={`${editableFieldClass} press min-h-12 max-w-28 cursor-pointer rounded-control border border-line bg-surface px-2 focus-visible:ring-2 focus-visible:ring-lime`}><option value="">{rt('grams')}</option>{item.food.units?.map(unit => <option key={unit.key} value={unit.key}>{locale === 'en' ? unit.name_en : unit.name_ar}</option>)}</select>
    <span className="font-display tabular-nums">{Math.round(values.kcal)}</span>
    <Button id={openerId} variant="secondary" block={false} onClick={() => setAlternatives(true)}>{rt('alternatives', { n: item.alternatives.length })}</Button>
    <IconButton aria-label={pt('deleteFood')} onClick={() => update(draft => removeItem(draft, item.id))}><X aria-hidden className="size-4" /></IconButton>
    {alternatives && <AlternativesSheet item={item} update={update} openerId={openerId} onClose={() => setAlternatives(false)} />}
    {error && <p role="alert" className="w-full text-danger">{error}</p>}
  </li>;
}

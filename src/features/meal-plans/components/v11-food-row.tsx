'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { foodPhotoUrl } from '@/core/storage/media-url';
import { macrosFor } from '@/lib/macros';
import type { MealItem, PlanDraft } from '../types';
import { removeItem, setGrams } from '../draft';
import { messages } from './v11/messages';
import { messages as planMessages } from '../messages';

export function V11FoodRow({ item, update }: { item: MealItem; update: (change: (draft: PlanDraft) => PlanDraft) => void }) {
  const t = useT(messages), pt = useT(planMessages), locale = useLocale();
  const [error, setError] = useState('');
  const values = macrosFor(item.food, item.grams);
  return <li className="flex min-w-0 flex-wrap items-center gap-2 border-t border-line-soft px-4 py-2.5 text-xs">
    <span className="size-9 shrink-0 overflow-hidden rounded-lg bg-surface">
      {/* Food storage hosts vary by deployment. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {item.food.photo && <img src={foodPhotoUrl(item.food.photo)} alt="" width={36} height={36} loading="lazy" className="size-9 object-cover" />}
    </span>
    <div className="min-w-0 flex-1"><b>{locale === 'en' ? item.food.nameEn || item.food.name : item.food.name}</b><p className="mt-1 text-muted">{t('grams', { n: item.grams })} · {t('macros', { p: Math.round(values.protein), c: Math.round(values.carbs), f: Math.round(values.fat) })}</p></div>
    <input type="number" aria-label={pt('gramsOf', { v0: item.food.name })} min={5} max={2000} step="any" value={item.grams} onChange={event => {
      const grams = event.target.valueAsNumber;
      if (!Number.isFinite(grams) || grams < 5 || grams > 2000) { setError(pt('amountMustBe5To2000Grams')); return; }
      setError(''); update(draft => setGrams(draft, item.id, grams, pt));
    }} className="min-h-12 w-14 rounded-lg border border-line bg-transparent text-center tabular-nums" />
    <span className="font-display tabular-nums">{Math.round(values.kcal)}</span>
    <button type="button" aria-label={pt('deleteFood')} onClick={() => update(draft => removeItem(draft, item.id))} className="grid min-h-12 min-w-12 place-items-center text-muted"><X aria-hidden className="size-4" /></button>
    {error && <p role="alert" className="w-full text-danger">{error}</p>}
  </li>;
}

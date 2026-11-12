'use client';

import { useState } from 'react';
import { X } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { macrosFor } from '@/lib/macros';
import { unitGrams, unitQuantity } from '../../editor-rules';
import { removeItem, setGrams } from '../../draft';
import type { MealItem, PlanDraft } from '../../types';
import { messages } from './workspace/messages';
import { messages as planMessages } from '../../messages';

export function FoodRow({ item, update }: { item: MealItem; update: (change: (draft: PlanDraft) => PlanDraft) => void }) {
  const t = useT(messages);
  const planT = useT(planMessages);
  const locale = useLocale();
  const [key, setKey] = useState(item.food.units?.[0]?.key ?? '');
  const [error, setError] = useState('');
  const [edited, setEdited] = useState<{ grams: number; key: string; text: string } | null>(null);
  const unit = item.food.units?.find(value => value.key === key);
  const unitName = unit ? locale === 'en' ? unit.name_en : unit.name_ar : t('grams');
  const name = locale === 'en' ? item.food.nameEn || item.food.name : item.food.name;
  return <li className="grid grid-cols-[minmax(0,1fr)_100px_48px] items-center gap-2 border-t border-line-soft px-[18px] py-2.5 text-[13px] min-[761px]:grid-cols-[minmax(0,1fr)_120px_70px_48px] min-[761px]:gap-3">
    <div className="min-w-0 break-words">{name}<small className="block text-[11.5px] text-faint">{t('per', { unit: unit ? unitName : t('hundred'), kcal: formatNumber(Math.round(macrosFor(item.food, unit?.grams ?? 100).kcal), locale) })}</small></div>
    <div className="flex min-h-12 min-w-0 items-center gap-1 rounded-xl border border-line px-1">
      <input type="number" aria-label={t('quantity', { name })} min={5 / (unit?.grams ?? 1)} max={2000 / (unit?.grams ?? 1)} step="any"
        value={edited?.grams === item.grams && edited.key === key ? edited.text : Math.round(unitQuantity(item.grams, unit) * 100) / 100}
        onChange={event => {
          const text = event.target.value;
          try {
            const grams = unitGrams(event.target.valueAsNumber, unit);
            if (grams < 5 || grams > 2000) throw new RangeError('Invalid amount');
            update(draft => setGrams(draft, item.id, grams, planT)); setEdited({ grams, key, text }); setError('');
          } catch { setEdited({ grams: item.grams, key, text }); setError(planT('amountMustBe5To2000Grams')); }
        }} className="min-h-12 w-12 min-w-0 bg-transparent text-center font-display font-extrabold tabular-nums" />
      {item.food.units?.length ? <select aria-label={t('unit')} value={key} onChange={event => setKey(event.target.value)} className="min-h-12 min-w-0 flex-1 bg-transparent text-xs text-faint">
        <option value="">{t('grams')}</option>{item.food.units.map(value => <option key={value.key} value={value.key}>{locale === 'en' ? value.name_en : value.name_ar}</option>)}
      </select> : <span className="text-xs text-faint">{unitName}</span>}
    </div>
    <span className="hidden font-display font-extrabold tabular-nums min-[761px]:block">{formatNumber(Math.round(macrosFor(item.food, item.grams).kcal), locale)}</span>
    <button type="button" aria-label={t('remove', { name })} className="grid min-h-12 min-w-12 place-items-center text-faint" onClick={() => update(draft => removeItem(draft, item.id))}><X aria-hidden className="size-4" /></button>
    {error && <p role="alert" className="col-span-full text-danger">{error}</p>}
  </li>;
}

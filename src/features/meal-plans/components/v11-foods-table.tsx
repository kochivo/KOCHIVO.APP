'use client';
import { secondaryButtonClass } from '@/ui/secondary-button-class';
import { Pencil } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { foodPhotoUrl } from '@/core/storage/media-url';
import { macrosFor } from '@/lib/macros';
import type { LibraryFood } from '../data/library-types';
import { messages } from './v11/messages';

export function V11FoodsTable({ foods, onSelect }: { foods: LibraryFood[]; onSelect: (food: LibraryFood) => void }) {
  const t = useT(messages), locale = useLocale();
  return <section className="glass min-w-0 rounded-card border border-line-soft px-1.5 py-1">
    <table className="w-full table-fixed text-start text-xs min-[761px]:table-auto min-[761px]:text-sm">
      <thead><tr>{(['food', 'unit', 'kcal', 'protein', 'carbs', 'fat', 'edit'] as const).map(key => <th key={key} scope="col" className={`px-1 py-3 text-start font-medium text-muted min-[761px]:px-3 ${key === 'food' ? 'w-[36%] min-[761px]:w-auto' : key === 'unit' ? 'w-1/5 min-[761px]:w-auto' : ''} ${key === 'carbs' || key === 'fat' ? 'hidden min-[761px]:table-cell' : ''}`}><span className={key === 'edit' ? 'sr-only' : ''}>{t(key)}</span></th>)}</tr></thead>
      <tbody>{foods.map(food => {
        const unit = food.units?.[0];
        const grams = unit?.grams ?? 100;
        const values = macrosFor(food, grams);
        return <tr key={food.id} className="border-t border-line-soft">
        <td className="px-1 py-3 min-[761px]:px-3"><div className="flex items-center gap-2">
          <span className="size-8 shrink-0 overflow-hidden rounded-lg bg-surface">
            {/* Storage images use deployment-specific public hosts. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {food.photo && <img src={foodPhotoUrl(food.photo)} alt="" width={32} height={32} loading="lazy" className="size-8 object-cover" />}
          </span><b className="min-w-0 break-words">{locale === 'en' ? food.nameEn || food.name : food.name}</b></div></td>
        <td className="break-words px-1 py-3 text-muted min-[761px]:px-3">{t('grams', { n: grams })}{unit && <> · {locale === 'en' ? unit.name_en : unit.name_ar}</>}</td>
        {(['kcal', 'protein', 'carbs', 'fat'] as const).map(key => <td key={key} className={`px-1 py-3 font-display tabular-nums min-[761px]:px-3 ${key === 'carbs' || key === 'fat' ? 'hidden min-[761px]:table-cell' : ''}`}>{Math.round(values[key] * 10) / 10}</td>)}
        <td>{food.custom && <button type="button" aria-label={t('edit')} onClick={() => onSelect(food)} className={`${secondaryButtonClass} grid min-h-12 min-w-12 place-items-center rounded-full`}><Pencil aria-hidden className="size-4" /></button>}</td>
      </tr>; })}</tbody>
    </table>{!foods.length && <p className="p-8 text-center text-muted">{t('empty')}</p>}
  </section>;
}

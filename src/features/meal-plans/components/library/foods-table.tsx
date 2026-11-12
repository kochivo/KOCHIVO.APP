'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { foodPhotoUrl } from '@/core/storage/media-url';
import type { LibraryFood } from '../../data/library-types';
import { messages } from './messages';

export function FoodsTable({ foods, onSelect }: { foods: LibraryFood[]; onSelect: (food: LibraryFood) => void }) {
  const t = useT(messages);
  const locale = useLocale();
  return <div className="glass overflow-x-auto rounded-card border border-line">
    <table className="w-full text-start text-sm">
      <thead className="text-muted"><tr>{(['food', 'kcal', 'protein', 'carbs', 'fat', 'units', 'usage'] as const)
        .map(key => <th key={key} scope="col" className="p-3 text-start font-medium">{t(key)}</th>)}</tr></thead>
      <tbody>{foods.map(food => {
        const photo = food.photo ? foodPhotoUrl(food.photo) : null;
        return <tr key={food.id} className="border-t border-line hover:bg-surface">
          <td className="p-3"><button type="button" className="flex min-h-12 min-w-40 items-center gap-3 text-start" onClick={() => onSelect(food)}>
            {/* Existing public food storage URLs do not require a Next image loader. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photo && <img src={photo} alt="" width={40} height={40} className="size-10 rounded-control object-cover" />}
            <span><span className="font-bold">{locale === 'en' ? food.nameEn || food.name : food.name}</span>
              <span className="block text-xs text-muted">{food.custom ? t('mine') : t('global')} · {t('per100')}</span></span>
          </button></td>
          {(['kcal', 'protein', 'carbs', 'fat'] as const).map(key => <td key={key} className="p-3 tabular-nums">{food[key]}</td>)}
          <td className="p-3"><div className="flex min-w-28 flex-wrap gap-1">{food.units?.length ? food.units.map(unit => <span key={unit.key}
            className="rounded-control border border-line px-2 py-1">{locale === 'en' ? unit.name_en : unit.name_ar} · {unit.grams}</span>) : null}</div></td>
          <td className="p-3 tabular-nums text-muted">{food.uses}</td>
        </tr>;
      })}</tbody>
    </table>
    {!foods.length && <p className="p-8 text-center text-muted">{t('empty')}</p>}
  </div>;
}

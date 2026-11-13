'use client';

import { Button } from '@/ui/button';
import { useLocale, useT } from '@/core/i18n/client';
import { foodPhotoUrl } from '@/core/storage/media-url';
import type { LibraryFood } from '../../data/library-types';
import { messages } from './messages';
import { messages as libraryMessages } from '../../library-messages';

export function FoodsTable({ foods, onSelect }: { foods: LibraryFood[]; onSelect: (food: LibraryFood) => void }) {
  const t = useT(messages);
  const lt = useT(libraryMessages);
  const locale = useLocale();
  return <div className="glass min-w-0 rounded-card border border-line-soft">
    <table className="block w-full text-start text-sm md:table">
      <thead className="block text-[11.5px] text-faint md:table-header-group"><tr className="block md:table-row">{(['food', 'kcal', 'protein', 'carbs', 'fat', 'units', 'usage'] as const)
        .map(key => <th key={key} scope="col" className={`${key === 'food' ? 'block' : 'hidden'} px-4 py-3 text-start font-medium md:table-cell`}>{t(key)}</th>)}</tr></thead>
      <tbody className="block md:table-row-group">{foods.map(food => {
        const photo = food.photo ? foodPhotoUrl(food.photo) : null;
        return <tr key={food.id} className="grid grid-cols-4 border-t border-line-soft md:table-row">
          <td className="col-span-4 min-w-0 px-4 py-3"><Button variant="secondary" type="button" className="flex min-h-12 w-full min-w-0 items-center gap-3 text-start" onClick={() => onSelect(food)}>
            {/* Existing public food storage URLs do not require a Next image loader. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {photo && <img src={photo} alt="" width={40} height={40} className="size-10 rounded-control object-cover" />}
            <span className="min-w-0 break-words"><span>{locale === 'en' ? food.nameEn || food.name : food.name}</span>
              <span className="block text-[11.5px] text-faint">{food.custom ? t('mine') : t('global')}</span></span>
          </Button></td>
          {(['kcal', 'protein', 'carbs', 'fat'] as const).map(key => <td key={key} className="px-4 py-3 font-display tabular-nums"><span className="mb-1 block font-sans text-xs text-faint md:hidden">{t(key)}</span>{food[key]}</td>)}
          <td className="col-span-3 px-4 py-3"><div className="flex flex-wrap gap-1">{food.units?.length ? food.units.map(unit => <span key={unit.key}
            className="text-xs text-muted">{lt('unitSummary', { name: locale === 'en' ? unit.name_en : unit.name_ar, grams: unit.grams })}</span>) : null}</div></td>
          <td className="px-4 py-3 font-display tabular-nums text-muted"><span className="mb-1 block font-sans text-xs text-faint md:hidden">{t('usage')}</span>{food.uses}</td>
        </tr>;
      })}</tbody>
    </table>
    {!foods.length && <p className="p-8 text-center text-muted">{t('empty')}</p>}
  </div>;
}

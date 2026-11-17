'use client';
import { Ellipsis, Eye, Plus, Star } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { foodPhotoUrl } from '@/core/storage/media-url';
import { IconButton } from '@/ui/icon-button';
import { clickableClass } from '@/ui/button';
import { macrosFor } from '@/lib/macros';
import type { Food } from '../../types';
import type { LibraryFood } from '../../data/library-types';
import { messages } from './v2/messages';
import { messages as baseMessages } from './messages';
import { FoodBadge } from './food-badge';
import { foodStatus } from './library-model';

const macros = { kcal: 'text-ink', protein: 'text-lime', carbs: 'text-info', fat: 'text-warn' } as const;

export function FoodResults({ foods, cards, favorites, empty, onSelect, onAdd, onFavorite }: {
  foods: LibraryFood[]; cards: boolean; favorites: Set<string>; empty: boolean;
  onSelect: (food: LibraryFood) => void; onAdd: (food: Food) => void; onFavorite: (id: string) => void;
}) {
  const t = useT(messages), bt = useT(baseMessages), locale = useLocale();
  return <div className="glass overflow-x-auto rounded-card border border-line-soft">
    <table className={`block w-full text-start text-row ${cards ? '' : 'min-[760px]:table'}`}>
      <thead className={cards ? 'hidden' : 'hidden min-[760px]:table-header-group'}><tr>{(['food', 'units', 'kcal', 'protein', 'carbs', 'fat'] as const).map(key =>
        <th key={key} scope="col" className="px-stack py-stack text-start text-xs font-medium text-muted">{key === 'food' ? t('foodName') : bt(key)}</th>)}
        <th scope="col"><span className="sr-only">{t('actions')}</span></th></tr></thead>
      <tbody className={`deferred-rows grid ${cards ? 'gap-stack p-stack min-[760px]:grid-cols-2 min-[1200px]:grid-cols-3' : 'min-[760px]:table-row-group'}`}>{foods.map(food => {
        const portion = food.units?.[0];
        const values = portion ? macrosFor(food, portion.grams) : food;
        return <tr key={food.id} className={`grid grid-cols-4 gap-inline border-t border-line-soft p-stack ${cards ? 'rounded-control border' : 'min-[760px]:table-row'}`}>
        <td className="col-span-4 px-stack"><button type="button" className={`${clickableClass} flex min-h-12 w-full flex-col items-start justify-center gap-inline text-start`} onClick={() => onSelect(food)}>
          {cards && <span className="grid aspect-video w-full shrink-0 place-items-center overflow-hidden rounded-control bg-surface-raised">
            {/* Public catalog photos are resolved centrally. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {food.photo && <img src={foodPhotoUrl(food.photo)} alt="" width={600} height={450} loading="lazy" className="size-full object-cover" />}
          </span>}<span className="flex min-w-0 flex-wrap items-center gap-inline"><b className="break-words">{locale === 'en' ? food.nameEn || food.name : food.name}</b>
            {food.custom && <span className="tone-lime rounded-md px-inline text-micro font-semibold">{bt('mine')}</span>}</span>
        </button></td>
        <td className="col-span-4 px-stack text-xs text-muted">{portion ? t('serving', { name: locale === 'en' ? portion.name_en : portion.name_ar, grams: portion.grams }) : t('defaultServing')}</td>
        {(['kcal', 'protein', 'carbs', 'fat'] as const).map(key => <td key={key} className={`px-stack font-display font-bold tabular-nums ${macros[key]}`}><span className={`block font-sans text-xs text-muted ${cards ? '' : 'min-[760px]:hidden'}`}>{bt(key)}</span>{values[key]}</td>)}
        <td className="col-span-4 px-stack"><details className="group">
          <summary aria-label={t('actions')} className={`${clickableClass} ms-auto grid min-h-12 w-12 list-none place-items-center rounded-control text-muted`}><Ellipsis aria-hidden className="size-4" /></summary>
          <div className="space-y-stack pb-stack">
            {food.nameEn && food.nameEn !== food.name && <p className="text-xs text-muted"><bdi>{locale === 'en' ? food.name : food.nameEn}</bdi></p>}
            <FoodBadge food={food} />
            <p className="text-xs text-muted">{t(food.region ?? 'intl')} · {food.source_ref && 'fdc_id' in food.source_ref ? `${food.source_ref.fdc_id} · ${food.source_ref.dataset}` : t(foodStatus(food))}</p>
            <div className="flex flex-wrap gap-inline"><IconButton aria-label={t('details')} onClick={() => onSelect(food)}><Eye aria-hidden className="size-4" /></IconButton><IconButton aria-label={t('add')} onClick={() => onAdd(food)}><Plus aria-hidden className="size-4" /></IconButton><IconButton aria-label={t('favorite')} aria-pressed={favorites.has(food.id)} onClick={() => onFavorite(food.id)}><Star aria-hidden className={`size-4 ${favorites.has(food.id) ? 'fill-lime text-lime' : ''}`} /></IconButton></div>
          </div>
        </details></td>
      </tr>; })}</tbody>
    </table>
    {!foods.length && <p className="p-section text-center text-muted">{t(empty ? 'empty' : 'noResults')}</p>}
  </div>;
}

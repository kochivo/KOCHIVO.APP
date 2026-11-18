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
  const desktopOnly = cards ? 'hidden' : 'hidden min-[760px]:table-cell';
  const compactOnly = cards ? '' : 'min-[760px]:hidden';
  return <div className="glass overflow-x-auto rounded-card border border-line-soft">
    <table className={`block w-full text-start text-row ${cards ? '' : 'min-[760px]:table'}`}>
      <thead className={cards ? 'hidden' : 'hidden min-[760px]:table-header-group'}><tr>{(['food', 'kcal', 'protein', 'carbs', 'fat', 'usage'] as const).map(key =>
        <th key={key} scope="col" className="px-stack py-stack text-start text-xs font-medium text-muted">{key === 'food' ? t('foodName') : bt(key)}</th>)}
        <th scope="col"><span className="sr-only">{t('actions')}</span></th></tr></thead>
      <tbody className={`deferred-rows grid ${cards ? 'gap-stack p-stack min-[760px]:grid-cols-2 min-[1200px]:grid-cols-3' : 'min-[760px]:table-row-group'}`}>{foods.map(food => {
        const name = locale === 'en' ? food.nameEn || food.name : food.name;
        const actionLabel = (key: 'actions' | 'add' | 'details' | 'favorite') => t('rowAction', { action: t(key), name });
        const portion = food.units?.[0];
        const values = portion ? macrosFor(food, portion.grams) : food;
        const serving = portion ? t('serving', { name: locale === 'en' ? portion.name_en : portion.name_ar, grams: portion.grams }) : t('defaultServing');
        return <tr key={food.id} className={`grid grid-cols-4 gap-inline border-t border-line-soft p-stack ${cards ? 'rounded-control border' : 'min-[760px]:table-row'}`}>
        <td className="col-span-4 px-stack"><button type="button" className={`${clickableClass} flex min-h-12 w-full gap-inline text-start ${cards ? 'flex-col items-start' : 'items-center min-[760px]:min-h-15'}`} onClick={() => onSelect(food)}>
          <span className={`shrink-0 overflow-hidden rounded-control bg-surface-raised ${cards ? 'block aspect-video w-full' : 'hidden size-10 min-[760px]:block'}`}>
            {/* Public catalog photos are resolved centrally. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {food.photo && <img src={foodPhotoUrl(food.photo)} alt="" width={600} height={450} loading="lazy" className="size-full object-cover" />}
          </span><span className="min-w-0">
            <span className="flex flex-wrap items-center gap-inline"><b className="break-words">{name}</b>
              {food.custom && <span className={`tone-lime rounded-md px-inline text-micro font-semibold ${compactOnly}`}>{bt('mine')}</span>}</span>
            {!cards && <span className="hidden text-xs text-muted min-[760px]:block">{t(food.region ?? 'intl')} · {serving}</span>}
          </span>
        </button></td>
        <td className={`col-span-4 px-stack text-xs text-muted ${compactOnly}`}>{serving}</td>
        {(['kcal', 'protein', 'carbs', 'fat'] as const).map(key => <td key={key} className={`px-stack font-display font-bold tabular-nums ${macros[key]} ${!cards && (key === 'carbs' || key === 'fat') ? 'min-[760px]:text-ink' : ''}`}><span className={`block font-sans text-xs text-muted ${compactOnly}`}>{bt(key)}</span>{values[key]}</td>)}
        <td className={`px-stack text-xs text-muted ${desktopOnly}`}>
          {food.custom && <span className="tone-neutral rounded-md px-inline text-micro font-semibold">{bt('mine')}</span>}
          {(!food.custom || food.uses > 0) && <span className="block">{t('usedInPlans', { count: food.uses })}</span>}
        </td>
        <td className="col-span-4 px-stack"><div className="flex items-start justify-end gap-inline">
          {!cards && <IconButton aria-label={actionLabel('add')} className="hidden min-[760px]:inline-flex" onClick={() => onAdd(food)}><Plus aria-hidden className="size-4" /></IconButton>}
          <details className="group">
          <summary aria-label={actionLabel('actions')} className={`${clickableClass} ms-auto grid min-h-12 w-12 list-none place-items-center rounded-control text-muted`}><Ellipsis aria-hidden className="size-4" /></summary>
          <div className="space-y-stack pb-stack">
            {food.nameEn && food.nameEn !== food.name && <p className="text-xs text-muted"><bdi>{locale === 'en' ? food.name : food.nameEn}</bdi></p>}
            <FoodBadge food={food} />
            <p className="text-xs text-muted">{t(food.region ?? 'intl')} · {food.source_ref && 'fdc_id' in food.source_ref ? `${food.source_ref.fdc_id} · ${food.source_ref.dataset}` : t(foodStatus(food))}</p>
            <div className="flex flex-wrap gap-inline"><IconButton aria-label={actionLabel('details')} onClick={() => onSelect(food)}><Eye aria-hidden className="size-4" /></IconButton><IconButton aria-label={actionLabel('add')} className={compactOnly} onClick={() => onAdd(food)}><Plus aria-hidden className="size-4" /></IconButton><IconButton aria-label={actionLabel('favorite')} aria-pressed={favorites.has(food.id)} onClick={() => onFavorite(food.id)}><Star aria-hidden className={`size-4 ${favorites.has(food.id) ? 'fill-lime text-lime' : ''}`} /></IconButton></div>
          </div>
        </details></div></td>
      </tr>; })}</tbody>
    </table>
    {!foods.length && <p className="p-section text-center text-muted">{t(empty ? 'empty' : 'noResults')}</p>}
  </div>;
}

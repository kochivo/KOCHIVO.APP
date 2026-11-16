'use client';
import { Eye, Plus, Star } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { foodPhotoUrl } from '@/core/storage/media-url';
import { IconButton } from '@/ui/icon-button';
import { Button } from '@/ui/button';
import type { Food } from '../../types';
import type { LibraryFood } from '../../data/library-types';
import { messages } from './v2/messages';
import { messages as baseMessages } from './messages';
import { FoodBadge } from './food-badge';
import { foodStatus } from './library-model';

export function FoodResults({ foods, cards, favorites, empty, onSelect, onAdd, onFavorite }: {
  foods: LibraryFood[]; cards: boolean; favorites: Set<string>; empty: boolean;
  onSelect: (food: LibraryFood) => void; onAdd: (food: Food) => void; onFavorite: (id: string) => void;
}) {
  const t = useT(messages), bt = useT(baseMessages), locale = useLocale();
  return <div className="glass overflow-x-auto rounded-card border border-line-soft">
    <table className={`block w-full text-start text-row ${cards ? '' : 'min-[1100px]:table'}`}>
      <thead className={cards ? 'hidden' : 'hidden min-[1100px]:table-header-group'}><tr>{['food', 'type', 'kcal', 'protein', 'carbs', 'fat', 'units', 'source', 'status', 'actions'].map(key => <th key={key} className="px-stack py-stack text-start text-xs font-medium text-muted">{key === 'type' || key === 'source' || key === 'status' || key === 'actions' ? t(key) : bt(key as 'food' | 'kcal' | 'protein' | 'carbs' | 'fat' | 'units')}</th>)}</tr></thead>
      <tbody className={`deferred-rows grid gap-stack p-stack ${cards ? 'min-[760px]:grid-cols-2 min-[1200px]:grid-cols-3' : 'min-[1100px]:table-row-group min-[1100px]:p-0'}`}>{foods.map(food => <tr key={food.id} className={`grid grid-cols-4 gap-inline rounded-control border border-line-soft p-stack ${cards ? '' : 'min-[1100px]:table-row'}`}>
        <td className="col-span-4 px-inline py-inline"><Button variant="secondary" className={`w-full flex-col items-start justify-start text-start ${cards ? '' : 'min-[1100px]:flex-row min-[1100px]:items-center'}`} onClick={() => onSelect(food)}>
          <span className={`grid aspect-video w-full shrink-0 place-items-center overflow-hidden rounded-control bg-surface-raised ${cards ? '' : 'min-[1100px]:aspect-square min-[1100px]:size-12'}`}>
            {/* Public catalog photos are resolved centrally. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {food.photo && <img src={foodPhotoUrl(food.photo)} alt="" width={600} height={450} loading="lazy" className="size-full object-cover" />}
          </span><span className="min-w-0 break-words"><b className="block">{locale === 'en' ? food.nameEn || food.name : food.name}</b><span className="block text-xs text-muted">{locale === 'en' ? food.name : food.nameEn}</span></span>
        </Button></td>
        <td className="col-span-4 px-inline py-inline text-muted">{t(food.region ?? 'intl')}</td>
        {(['kcal', 'protein', 'carbs', 'fat'] as const).map(key => <td key={key} className="px-inline py-inline font-display tabular-nums"><span className={`block font-sans text-xs text-muted ${cards ? '' : 'min-[1100px]:hidden'}`}>{bt(key)}</span>{food[key]}</td>)}
        <td className="col-span-4 px-inline py-inline text-xs text-muted">{food.units?.[0] ? t('serving', { name: locale === 'en' ? food.units[0].name_en : food.units[0].name_ar, grams: food.units[0].grams }) : bt('noUnits')}</td>
        <td className="col-span-2 px-inline py-inline text-xs text-muted">{food.source_ref && 'fdc_id' in food.source_ref ? `${food.source_ref.fdc_id} · ${food.source_ref.dataset}` : t(foodStatus(food))}</td>
        <td className="col-span-2 px-inline py-inline"><FoodBadge food={food} /></td>
        <td className="col-span-4 px-inline py-inline"><div className="flex gap-inline"><IconButton aria-label={t('details')} onClick={() => onSelect(food)}><Eye aria-hidden className="size-4" /></IconButton><IconButton aria-label={t('add')} onClick={() => onAdd(food)}><Plus aria-hidden className="size-4" /></IconButton><IconButton aria-label={t('favorite')} aria-pressed={favorites.has(food.id)} onClick={() => onFavorite(food.id)}><Star aria-hidden className={`size-4 ${favorites.has(food.id) ? 'fill-lime text-lime' : ''}`} /></IconButton></div></td>
      </tr>)}</tbody>
    </table>
    {!foods.length && <p className="p-section text-center text-muted">{t(empty ? 'empty' : 'noResults')}</p>}
  </div>;
}

'use client';
import { clickableClass, Button } from '@/ui/button';
import { editableFieldClass } from '@/ui/edit-in-place';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { KoPlus as Plus } from '@/ui/icons/ko-plus';
import { useLocale, useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { foodPhotoUrl } from '@/core/storage/media-url';

import { LoadingState } from '@/ui/loading-state';
import { searchFoods } from '../data/foods';
import type { Food, Meal } from '../types';
import { DefaultPortion } from './editor/default-portion';
import { messages as redesignMessages } from './editor/redesign/messages';
import { filterFoods } from './v11-model';
import { messages } from './v11/messages';

export function V11FoodPicker({ onPick, disabled, navigationDisabled = false, meals, inline = false, alternative = false }: { onPick: (food: Food, mealId?: string) => void; disabled: boolean; navigationDisabled?: boolean; meals?: Meal[]; inline?: boolean; alternative?: boolean }) {
  const t = useT(messages), locale = useLocale();
  const rt = useT(redesignMessages);
  const [choosing, setChoosing] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'all' | 'mine' | 'protein' | 'carbs'>('all');
  const load = useCallback(async () => {
    const result = await searchFoods({ query, mine: tab === 'mine', ...(tab === 'protein' || tab === 'carbs' ? { category: tab } : {}) });
    if (!result.ok) throw new Error(result.error);
    return result.data.foods;
  }, [query, tab]);
  const resource = useResource(`v11-picker:${JSON.stringify([query, tab])}`, load);
  return <section className="glass min-w-0 rounded-card border border-line-soft p-card">
    {!inline && <div className="mb-stack flex items-center justify-between gap-inline"><h2 className="font-semibold">{t('foods')}</h2><Link href="/captain/library/foods" aria-disabled={navigationDisabled} onNavigate={event => { if (navigationDisabled) event.preventDefault(); }} className={`${clickableClass} press inline-flex min-h-12 cursor-pointer items-center rounded-control border border-line bg-surface px-stack text-sm focus-visible:ring-2 focus-visible:ring-lime`}>{t('open')}</Link></div>}
    <label className="flex items-center gap-inline rounded-full border border-line px-stack"><Search className="size-4 text-muted" aria-hidden /><input type="search" aria-label={t('search')} placeholder={t('search')} maxLength={100} value={query} onChange={event => setQuery(event.target.value)} className={`${editableFieldClass} min-h-12 min-w-0 w-full rounded-control bg-surface text-sm focus-visible:ring-2 focus-visible:ring-lime`} /></label>
    <div className="my-inline flex flex-wrap gap-inline">{(['all', 'protein', 'carbs', 'mine'] as const).map(value => <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)} className={`${clickableClass} press min-h-12 cursor-pointer rounded-full border border-line px-stack text-xs focus-visible:ring-2 focus-visible:ring-lime ${tab === value ? 'bg-lime/10 text-lime' : 'bg-surface text-muted'}`}>{t(value)}</button>)}</div>
    {(resource.status === 'idle' || resource.status === 'loading') && <LoadingState variant="list" />}
    {Boolean(resource.error) && <div role="alert">{t('error')}<Button variant="secondary" onClick={() => void resource.retry()}>{t('retry')}</Button></div>}
    {resource.data && <ul>{!resource.data.length && <li className="py-page-y text-sm text-muted">{t('empty')}</li>}{filterFoods(resource.data, tab === 'mine' ? 'mine' : 'all').map(food => <li key={food.id} className="flex flex-wrap items-center gap-stack border-t border-line-soft py-inline">
      <span className="size-9 shrink-0 overflow-hidden rounded-control bg-surface">
        {/* Food storage hosts vary by deployment. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {food.photo && <img src={foodPhotoUrl(food.photo)} alt="" width={36} height={36} loading="lazy" className="size-9 object-cover" />}
      </span>
      <div className="min-w-0 flex-1"><b className="text-sm">{locale === 'en' ? food.nameEn || food.name : food.name}</b><DefaultPortion food={food} /></div>
      <Button type="button" disabled={disabled || (alternative && food.kcal <= 0)} onClick={() => meals ? setChoosing(choosing === food.id ? null : food.id) : onPick(food)} aria-label={t('add')} variant={'secondary'} block={false} className={"grid min-h-12 min-w-12 place-items-center text-lime disabled:opacity-40"}>{inline ? rt('add') : <Plus aria-hidden className="size-4" />}</Button>
      {choosing === food.id && meals && <div className="sheet grid w-full gap-inline rounded-control border border-line p-stack"><small>{rt('chooseMeal', { food: locale === 'en' ? food.nameEn || food.name : food.name })}</small>{meals.map(meal => <Button variant="secondary" key={meal.id} onClick={() => { onPick(food, meal.id); setChoosing(null); }}>{meal.name}</Button>)}</div>}
    </li>)}</ul>}
  </section>;
}

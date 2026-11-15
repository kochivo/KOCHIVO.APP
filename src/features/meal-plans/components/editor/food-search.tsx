'use client';

import { useCallback, useId, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Search } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { Button } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { searchFoods } from '../../data/foods';
import type { Food } from '../../types';
import { messages } from './workspace/messages';
import { messages as planMessages } from '../../messages';
const FoodForm = dynamic(() => import('../food-form').then(module => module.FoodForm),
  { loading: () => <LoadingState variant="detail" /> });

export function FoodSearch({ onPick, meal }: { onPick: (food: Food, grams: number) => void; meal?: string }) {
  const t = useT(messages);
  const planT = useT(planMessages);
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [creating, setCreating] = useState(false);
  const openerId = useId();
  const formBusy = useRef(false);
  const term = query.trim();
  const load = useCallback(async () => {
    const result = await searchFoods({ query: term, limit: 20 });
    if (!result.ok) throw new Error(result.error);
    return result.data;
  }, [term]);
  const resource = useResource(term ? `meal-editor:foods:${term}` : null, load);
  return <div className="border-t border-dashed border-line">
    <div className="flex flex-wrap items-center gap-2 px-4">
    <label className="flex min-h-12 min-w-0 flex-1 items-center gap-2.5 text-faint"><Search aria-hidden className="size-4 shrink-0" />
      <input type="search" aria-label={t('search')} placeholder={meal ? t('mealSearch', { meal }) : t('search')} value={query} maxLength={100} onChange={event => setQuery(event.target.value)}
        className="min-h-12 min-w-0 flex-1 bg-transparent text-xs placeholder:text-faint" />
    </label>
    <Button variant="secondary" id={openerId} type="button" className="min-h-12 text-xs" onClick={() => setCreating(true)}><Plus aria-hidden className="size-4" />{t('createFood')}</Button>
    </div>
    {creating && <ResponsiveDialog modal openerId={openerId} fallbackId={openerId} aria-label={planT('newFood')}
      onDismiss={() => { if (!formBusy.current) setCreating(false); }}
      className="sheet fixed inset-0 m-0 h-dvh max-h-none w-full max-w-none overflow-y-auto p-4 text-ink sm:p-6">
      <FoodForm initialName={query} onCancel={() => setCreating(false)} onBusyChange={busy => { formBusy.current = busy; }} onSaved={(food, grams) => {
        onPick(food, grams >= 5 && grams <= 2000 ? grams : 100); setCreating(false); setQuery('');
      }} />
    </ResponsiveDialog>}
    {term && <div className="px-4 pb-3">
      {resource.status === 'loading' || resource.status === 'idle' ? <LoadingState variant="list" />
        : resource.error ? <div role="alert" className="text-sm text-danger">{planT('searchFailedTryAgain')}<Button variant="secondary" onClick={() => void resource.retry()}>{t('retry')}</Button></div>
        : !resource.data?.foods.length ? <p className="text-xs text-faint">{planT(resource.data?.catalogEmpty ? 'theFoodLibraryIsEmpty' : 'noFoodWithThisName')}</p>
        : <ul className="deferred-rows max-h-72 overflow-y-auto">{resource.data.foods.map(food => <li key={food.id}>
          <Button variant="secondary" type="button" className="min-h-12 w-full border-t border-line-soft px-3 text-start text-sm" onClick={() => {
            const grams = food.units?.[0]?.grams ?? 100;
            onPick(food, grams >= 5 && grams <= 2000 ? grams : 100); setQuery('');
          }}><Plus aria-hidden className="size-4 shrink-0" />{locale === 'en' ? food.nameEn || food.name : food.name}</Button>
        </li>)}</ul>}
    </div>}
  </div>;
}

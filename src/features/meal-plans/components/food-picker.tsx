'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';
import { useEffect, useId, useState } from 'react';
import dynamic from 'next/dynamic';
import { foodPhotoUrl } from '@/core/storage/media-url';
import { Search } from 'lucide-react';
import { Button, EmptyState, Segmented } from '@/ui';
import { LoadingState } from '@/ui/loading-state';
import { searchFoods } from '../data/foods';
import type { Food } from '../types';
const CustomFoodSheet = dynamic(() => import('./custom-food-sheet').then(module => module.CustomFoodSheet));

export function FoodPicker({ onPick, alternative = false }: { onPick: (food: Food, grams: number) => void; alternative?: boolean }) {
  const t = useT(messages);
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [grams, setGrams] = useState(100);
  const [result, setResult] = useState<{ foods: Food[]; catalogEmpty: boolean } | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [creating, setCreating] = useState(false);
  const [creationError, setCreationError] = useState('');
  const openerId = useId();
  useEffect(() => {
    let current = true;
    searchFoods({ query, limit: 30, mine: filter === 'mine' }).then(value => {
      if (current) { setResult(value); setLoading(false); setError(false); }
    }).catch(() => { if (current) { setError(true); setLoading(false); } });
    return () => { current = false; };
  }, [query, retry, filter]);
  return <section aria-label={alternative ? t('chooseAnAlternative') : t('chooseAFood')} className="glass grid gap-3 rounded-card p-4">
    <Segmented aria-label={t('searchFoods')} options={[{ value: 'all', label: t('allFoods') }, { value: 'mine', label: t('myFoods') }]}
      value={filter} onChange={value => { if (value !== filter) { setFilter(value); setLoading(true); } }} />
    <label>{t('searchFoods')}<input value={query} onChange={event => { setQuery(event.target.value); setLoading(true); }}
      className="mt-2 min-h-12 w-full rounded-control border border-line bg-surface px-3" /></label>
    {!alternative && <label>{t('grams')}<input type="number" min={5} max={2000} step={5} value={grams}
      onChange={event => setGrams(Number(event.target.value))} className="ms-3 min-h-12 w-28 rounded-control bg-surface px-3" /></label>}
    {loading ? <LoadingState variant="list" /> : error ? <div role="alert">{t('searchFailed')} <Button variant="secondary" onClick={() => { setLoading(true); setRetry(n => n + 1); }}>{t('tryAgain')}</Button></div> : <>
      {!result?.foods.length && <EmptyState id={openerId} tabIndex={-1} icon={Search} title={result?.catalogEmpty ? t('theFoodLibraryIsEmpty') : t('noFoodWithThisName')} body={result?.catalogEmpty ? t('catalogHint') : t('searchHint')}
        action={result?.catalogEmpty ? { label: t('newFood'), onClick: () => setCreating(true) } :
          { label: t('clearSearch'), onClick: () => { setQuery(''); setFilter('all'); setLoading(true); setRetry(n => n + 1); } }} />}
      <ul className="grid max-h-96 gap-2 overflow-y-auto">{result?.foods.map(food => <li key={food.id}>
        <button type="button" disabled={(!alternative && (!Number.isFinite(grams) || grams < 5 || grams > 2000 || grams % 5 !== 0)) || (alternative && food.kcal <= 0)}
          onClick={() => onPick(food, grams)} className="flex min-h-12 w-full items-center gap-3 rounded-control border border-line p-3 text-start disabled:opacity-40">
          {/* Public storage hosts vary by deployment and are not in the optimizer allowlist. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {food.photo && <img src={foodPhotoUrl(food.photo)} alt="" width={48} height={48} loading="lazy" decoding="async" className="size-12 shrink-0 rounded-control object-cover" />}
          <span><strong>{food.name}</strong>{food.custom && <span className="ms-2 rounded-control bg-surface px-2 text-xs text-muted">{t('mine')}</span>}<span className="block text-sm text-muted">{t('per100g')} {formatNumber(food.kcal, locale)}  {t('kcalProtein')} {formatNumber(food.protein, locale)}  {t('carbs')} {formatNumber(food.carbs, locale)}  {t('fat')} {formatNumber(food.fat, locale)}</span></span>
        </button>
      </li>)}</ul>
    </>}
    {creationError && <p role="alert" className="text-danger">{creationError}</p>}
    {creating && <CustomFoodSheet alternative={alternative} openerId={openerId} onClose={() => setCreating(false)} onSave={(food, amount) => {
      if (alternative && food.kcal <= 0) { setCreationError(t('alternativeNeedsCalories')); setCreating(false); return; }
      setCreationError(''); onPick(food, amount); setCreating(false);
    }} />}
  </section>;
}

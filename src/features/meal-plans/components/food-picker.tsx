'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';
import { useEffect, useState } from 'react';
import { publicEnv } from '@/core/config/env';
import { Button } from '@/ui';
import { searchFoods } from '../data/foods';
import type { Food } from '../types';

function foodMediaUrl(path: string) {
  return `${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/food-media/${encodeURI(path)}`;
}
export function FoodPicker({ onPick, alternative = false }: { onPick: (food: Food, grams: number) => void; alternative?: boolean }) {
  const t = useT(messages);
  const locale = useLocale();
  const [query, setQuery] = useState('');
  const [grams, setGrams] = useState(100);
  const [result, setResult] = useState<{ foods: Food[]; catalogEmpty: boolean } | null>(null);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let current = true;
    searchFoods({ query, limit: 30 }).then(value => {
      if (current) { setResult(value); setLoading(false); setError(false); }
    }).catch(() => { if (current) { setError(true); setLoading(false); } });
    return () => { current = false; };
  }, [query, retry]);
  return <section aria-label={alternative ? t('chooseAnAlternative') : t('chooseAFood')} className="glass grid gap-3 rounded-card p-4">
    <label>{t('searchFoods')}<input value={query} onChange={event => { setQuery(event.target.value); setLoading(true); }}
      className="mt-2 min-h-12 w-full rounded-control border border-line bg-surface px-3" /></label>
    {!alternative && <label>{t('grams')}<input type="number" min={5} max={2000} step={5} value={grams}
      onChange={event => setGrams(Number(event.target.value))} className="ms-3 min-h-12 w-28 rounded-control bg-surface px-3" /></label>}
    {loading ? <p role="status">{t('loadingFoods')}</p> : error ? <div role="alert">{t('searchFailed')} <Button variant="secondary" onClick={() => { setLoading(true); setRetry(n => n + 1); }}>{t('tryAgain')}</Button></div> : <>
      {!result?.foods.length && <p>{result?.catalogEmpty ? t('theFoodLibraryIsEmpty') : t('noFoodWithThisName')}</p>}
      <ul className="grid max-h-96 gap-2 overflow-y-auto">{result?.foods.map(food => <li key={food.id}>
        <button type="button" disabled={(!alternative && (!Number.isFinite(grams) || grams < 5 || grams > 2000 || grams % 5 !== 0)) || (alternative && food.kcal <= 0)}
          onClick={() => onPick(food, grams)} className="flex min-h-12 w-full items-center gap-3 rounded-control border border-line p-3 text-start disabled:opacity-40">
          {/* Public storage hosts vary by deployment and are not in the optimizer allowlist. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {food.photo && <img src={foodMediaUrl(food.photo)} alt="" width={48} height={48} loading="lazy" decoding="async" className="size-12 shrink-0 rounded-control object-cover" />}
          <span><strong>{food.name}</strong><span className="block text-sm text-muted">{t('per100g')} {formatNumber(food.kcal, locale)}  {t('kcalProtein')} {formatNumber(food.protein, locale)}  {t('carbs')} {formatNumber(food.carbs, locale)}  {t('fat')} {formatNumber(food.fat, locale)}</span></span>
        </button>
      </li>)}</ul>
    </>}
  </section>;
}

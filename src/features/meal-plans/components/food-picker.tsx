'use client';
import { useEffect, useState } from 'react';
import { publicEnv } from '@/core/config/env';
import { Button } from '@/ui';
import { searchFoods } from '../data/foods';
import type { Food } from '../types';

function foodMediaUrl(path: string) {
  return `${publicEnv().NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/food-media/${encodeURI(path)}`;
}
export function FoodPicker({ onPick, alternative = false }: { onPick: (food: Food, grams: number) => void; alternative?: boolean }) {
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
  return <section aria-label={alternative ? 'اختار بديل' : 'اختار أكلة'} className="glass grid gap-3 rounded-card p-4">
    <label>دور على أكلة<input value={query} onChange={event => { setQuery(event.target.value); setLoading(true); }}
      className="mt-2 min-h-12 w-full rounded-control border border-line bg-surface px-3" /></label>
    {!alternative && <label>الجرامات<input type="number" min={5} max={2000} step={5} value={grams}
      onChange={event => setGrams(Number(event.target.value))} className="ms-3 min-h-12 w-28 rounded-control bg-surface px-3" /></label>}
    {loading ? <p role="status">جاري تحميل الأكل</p> : error ? <div role="alert">البحث متعملش <Button variant="secondary" onClick={() => { setLoading(true); setRetry(n => n + 1); }}>جرّب تاني</Button></div> : <>
      {!result?.foods.length && <p>{result?.catalogEmpty ? 'مكتبة الأكل لسه فاضية' : 'مفيش أكلة بالاسم ده'}</p>}
      <ul className="grid max-h-96 gap-2 overflow-y-auto">{result?.foods.map(food => <li key={food.id}>
        <button type="button" disabled={(!alternative && (!Number.isFinite(grams) || grams < 5 || grams > 2000 || grams % 5 !== 0)) || (alternative && food.kcal <= 0)}
          onClick={() => onPick(food, grams)} className="flex min-h-12 w-full items-center gap-3 rounded-control border border-line p-3 text-start disabled:opacity-40">
          {/* Catalog media uses the existing public storage URL convention. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {food.photo && <img src={foodMediaUrl(food.photo)} alt="" width={48} height={48} className="size-12 rounded-control object-cover" />}
          <span><strong>{food.name}</strong><span className="block text-sm text-muted">لكل ١٠٠ج: {food.kcal} سعرة · بروتين {food.protein} · كارب {food.carbs} · دهون {food.fat}</span></span>
        </button>
      </li>)}</ul>
    </>}
  </section>;
}

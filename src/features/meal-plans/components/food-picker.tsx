'use client';

import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { IconButton } from '@/ui/icon-button';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';
import { useEffect, useId, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { foodPhotoUrl } from '@/core/storage/media-url';
import { Pencil, Search, Trash2 } from 'lucide-react';
import { useToast } from '@/ui/toast';
import { deleteCustomFood } from '../data/custom-food';
import { Button } from '@/ui/button';
import { EmptyState, Segmented } from '@/ui';
import { LoadingState } from '@/ui/loading-state';
import { searchFoods } from '../data/foods';
import type { Food } from '../types';
import { messages as editorMessages } from './editor/messages';
const CustomFoodSheet = dynamic(() => import('./custom-food-sheet').then(module => module.CustomFoodSheet));

export function FoodPicker({ onPick, alternative = false, inline = false }: { onPick: (food: Food, grams: number) => void; alternative?: boolean; inline?: boolean }) {
  const t = useT(messages);
  const editorT = useT(editorMessages);
  const locale = useLocale();
  const toast = useToast();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [grams, setGrams] = useState(100);
  const [result, setResult] = useState<{ foods: Food[]; catalogEmpty: boolean } | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [retry, setRetry] = useState(0);
  const [creating, setCreating] = useState(false);
  const [creationError, setCreationError] = useState('');
  const [editing, setEditing] = useState<Food | undefined>();
  const pending = useRef(new Set<string>());
  const changes = useRef(new Map<string, Food | null>());
  const latestQuery = useRef(query);
  const openerId = useId();
  function showFood(food: Food) {
    changes.current.set(food.id, food);
    setResult(value => ({ catalogEmpty: false, foods: [
      ...(food.name.toLocaleLowerCase().includes(latestQuery.current.trim().toLocaleLowerCase()) ? [food] : []),
      ...(value?.foods ?? []).filter(row => row.id !== food.id),
    ] }));
  }
  async function remove(food: Food) {
    if (pending.current.has(food.id) || !window.confirm(t('confirmDeleteFood'))) return;
    pending.current.add(food.id);
    changes.current.set(food.id, null);
    setResult(value => value && { ...value, foods: value.foods.filter(row => row.id !== food.id) });
    try {
      const result = await deleteCustomFood(food.id);
      if (!result.ok) { showFood(food); toast.error(result.error); return; }
      toast.success(t(result.data?.archived ? 'foodArchived' : 'foodDeleted'));
    }
    catch {
      showFood(food);
      toast.error(t('foodDeleteFailed'));
    } finally { pending.current.delete(food.id); }
  }
  useEffect(() => {
    latestQuery.current = query;
    let current = true;
    searchFoods({ query, limit: inline ? 20 : 30, mine: filter === 'mine' }).then(response => {
      if (current) {
        if (!response.ok) { setError(response.error); setLoading(false); return; }
        const value = response.data;
        const foods = value.foods.filter(food => !changes.current.has(food.id));
        const local = [...changes.current.values()].filter((food): food is Food => food !== null &&
          food.name.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()));
        setResult({ foods: [...local, ...foods].slice(0, inline ? 20 : 30), catalogEmpty: value.catalogEmpty && !local.length });
        setLoading(false); setError('');
      }
    }).catch(() => { if (current) { setError(t('searchFailedTryAgain')); setLoading(false); } });
    return () => { current = false; };
  }, [query, retry, filter, t, inline]);
  return <section aria-label={alternative ? t('chooseAnAlternative') : t('chooseAFood')} className="glass grid gap-3 rounded-card p-4">
    {!inline && <Button id={openerId} variant="secondary" onClick={() => setCreating(true)}>{t('newFood')}</Button>}
    <Segmented aria-label={t('searchFoods')} options={[{ value: 'all', label: t('allFoods') }, { value: 'mine', label: t('myFoods') }]}
      value={filter} onChange={value => { if (value !== filter) { setFilter(value); setLoading(true); } }} />
    <label>{t('searchFoods')}<input value={query} onChange={event => { setQuery(event.target.value); setLoading(true); }}
      className="mt-2 min-h-12 w-full rounded-control border border-line bg-surface px-3" /></label>
    {!alternative && <label>{t('grams')}<input type="number" min={5} max={2000} step={5} value={grams}
      onChange={event => setGrams(Number(event.target.value))} className="ms-3 min-h-12 w-28 rounded-control bg-surface px-3" /></label>}
    {loading ? <LoadingState variant="list" /> : error ? <div role="alert">{error} <Button variant="secondary" onClick={() => { setLoading(true); setRetry(n => n + 1); }}>{t('tryAgain')}</Button></div> : <>
      {!result?.foods.length && <EmptyState tabIndex={-1} icon={Search} title={result?.catalogEmpty ? t('theFoodLibraryIsEmpty') : t('noFoodWithThisName')} body={result?.catalogEmpty ? t('catalogHint') : t('searchHint')}
        action={result?.catalogEmpty || filter === 'mine' ? { label: t('newFood'), onClick: () => setCreating(true) } :
          { label: t('clearSearch'), onClick: () => { setQuery(''); setFilter('all'); setLoading(true); setRetry(n => n + 1); } }} />}
      <ul className="grid max-h-96 gap-2 overflow-y-auto">{result?.foods.map(food => <li key={food.id}>
        <Button type="button" disabled={(!alternative && (!Number.isFinite(grams) || grams < 5 || grams > 2000 || grams % 5 !== 0)) || (alternative && food.kcal <= 0)}
          onClick={() => onPick(food, grams)} variant={'secondary'} block={false} className={"flex min-h-12 w-full items-center gap-3 p-3 text-start disabled:opacity-40"}>
          {/* Public storage hosts vary by deployment and are not in the optimizer allowlist. */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          {food.photo && <img src={foodPhotoUrl(food.photo)} alt="" width={48} height={48} loading="lazy" decoding="async" className="size-12 shrink-0 rounded-control object-cover" />}
          <span><strong>{food.name}</strong>{food.custom && <span className="ms-2 rounded-control bg-surface px-2 text-xs text-muted">{t(inline ? 'myFoods' : 'mine')}</span>}<span className="block text-sm text-muted">{t('per100g')} {formatNumber(food.kcal, locale)}  {t('kcalProtein')} {formatNumber(food.protein, locale)}  {t('carbs')} {formatNumber(food.carbs, locale)}  {t('fat')} {formatNumber(food.fat, locale)}</span></span>
        </Button>
        {food.custom && <div className="flex gap-2">
          {captainWorkspaceEnabled() ? <IconButton aria-label={t('editFood')} onClick={() => setEditing(food)}><Pencil aria-hidden /></IconButton> : <Button variant="ghost" aria-label={t('editFood')} onClick={() => setEditing(food)}><Pencil aria-hidden /></Button>}
          {captainWorkspaceEnabled() ? <IconButton className="border border-danger/40 text-danger!" aria-label={t('deleteFood')} onClick={() => void remove(food)}><Trash2 aria-hidden /></IconButton> : <Button variant="ghost" aria-label={t('deleteFood')} onClick={() => void remove(food)}><Trash2 aria-hidden /></Button>}
        </div>}
      </li>)}</ul>
    </>}
    {inline && <Button id={openerId} variant="secondary" onClick={() => setCreating(true)}>{editorT('missing')}</Button>}
    {creationError && <p role="alert" className="text-danger">{creationError}</p>}
    {creating && <CustomFoodSheet initialName={inline ? query : undefined} alternative={alternative} openerId={openerId} onClose={() => setCreating(false)} onSave={(food, amount) => {
      if (alternative && food.kcal <= 0) { setCreationError(t('alternativeNeedsCalories')); setCreating(false); return; }
      showFood(food); setCreationError(''); onPick(food, amount); setCreating(false);
    }} />}
    {editing && <CustomFoodSheet food={editing} openerId={openerId} onClose={() => setEditing(undefined)}
      onOptimistic={food => { const previous = editing; showFood(food); return () => showFood(previous); }}
      onSave={food => { showFood(food); setEditing(undefined); }} />}
  </section>;
}

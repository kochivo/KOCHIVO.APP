'use client';
import { useCallback, useState } from 'react';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { Button } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { searchFoods } from '../data/foods';
import type { Food } from '../types';
import { filterFoods } from './v11-model';
import { messages } from './v11/messages';

export function V11FoodPicker({ onPick, disabled, navigationDisabled = false }: { onPick: (food: Food) => void; disabled: boolean; navigationDisabled?: boolean }) {
  const t = useT(messages), locale = useLocale();
  const [query, setQuery] = useState('');
  const [tab, setTab] = useState<'all' | 'mine'>('all');
  const load = useCallback(async () => {
    const result = await searchFoods({ query, mine: tab === 'mine' });
    if (!result.ok) throw new Error(result.error);
    return result.data.foods;
  }, [query, tab]);
  const resource = useResource(`v11-picker:${JSON.stringify([query, tab])}`, load);
  return <section className="glass min-w-0 rounded-card border border-line-soft p-5">
    <div className="mb-3 flex items-center justify-between gap-2"><h2 className="font-semibold">{t('foods')}</h2><Link href="/captain/library/foods" aria-disabled={navigationDisabled} onNavigate={event => { if (navigationDisabled) event.preventDefault(); }} className="inline-flex min-h-12 items-center text-sm text-lime">{t('open')}</Link></div>
    <label className="flex items-center gap-2 rounded-full border border-line px-3"><Search className="size-4 text-muted" aria-hidden /><input aria-label={t('search')} placeholder={t('search')} maxLength={100} value={query} onChange={event => setQuery(event.target.value)} className="min-h-12 min-w-0 w-full bg-transparent text-sm" /></label>
    <div className="my-2 flex gap-2">{(['all', 'mine'] as const).map(value => <button key={value} type="button" aria-pressed={tab === value} onClick={() => setTab(value)} className={`min-h-12 rounded-full px-3 text-xs ${tab === value ? 'bg-lime/10 text-lime' : 'text-muted'}`}>{t(value)}</button>)}</div>
    {(resource.status === 'idle' || resource.status === 'loading') && <LoadingState variant="list" />}
    {Boolean(resource.error) && <div role="alert">{t('error')}<Button variant="secondary" onClick={() => void resource.retry()}>{t('retry')}</Button></div>}
    {resource.data && <ul>{!resource.data.length && <li className="py-4 text-sm text-muted">{t('empty')}</li>}{filterFoods(resource.data, tab).map(food => <li key={food.id} className="flex items-center gap-3 border-t border-line-soft py-2">
      <div className="min-w-0 flex-1"><b className="text-sm">{locale === 'en' ? food.nameEn || food.name : food.name}</b><p className="text-xs text-muted">{t('grams', { n: 100 })} · {t('calories', { n: food.kcal })} · {t('protein')} {food.protein}</p></div>
      <Button type="button" disabled={disabled} onClick={() => onPick(food)} aria-label={t('add')} variant={'secondary'} block={false} className={"grid min-h-12 min-w-12 place-items-center text-lime disabled:opacity-40"}><Plus aria-hidden className="size-4" /></Button>
    </li>)}</ul>}
  </section>;
}

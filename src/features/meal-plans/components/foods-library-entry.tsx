'use client';

import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Plus, Search } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { listLibraryFoods } from '../data/food-library';
import type { FoodSegment, LibraryFood } from '../data/library-types';
import { messages } from './library/messages';
import { FoodsTable } from './library/foods-table';

const FoodDrawer = dynamic(() => import('./library/food-drawer').then(module => module.FoodDrawer));

export function FoodsLibraryEntry() {
  const t = useT(messages);
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState<FoodSegment>('all');
  const [cursor, setCursor] = useState<string | null>(null);
  const [selected, setSelected] = useState<LibraryFood | null | undefined>();
  const load = useCallback(async () => {
    const result = await listLibraryFoods({ query: search, segment, cursor });
    if (!result.ok) throw new Error(result.error);
    return result.data;
  }, [search, segment, cursor]);
  const resource = useResource(`foods-library:${JSON.stringify([search, segment, cursor])}`, load);
  return <section className="grid gap-5">
    <header className="flex flex-wrap items-center gap-4">
      <div className="me-auto"><h1 className="text-2xl font-bold">{t('title')}</h1><p className="mt-1 text-sm text-muted">{t('subtitle')}</p></div>
      <form className="flex items-center gap-2 rounded-control border border-line bg-surface px-3" onSubmit={event => {
        event.preventDefault(); setCursor(null); setSearch(query.trim());
      }}>
        <input maxLength={100} className="min-h-12 min-w-0 bg-transparent" aria-label={t('search')} placeholder={t('search')} value={query} onChange={e => setQuery(e.target.value)} />
        <button type="submit" className="flex min-h-12 min-w-12 items-center justify-center" aria-label={t('search')}><Search aria-hidden className="size-5" /></button>
      </form>
      <button id="new-library-food" type="button" disabled={selected !== undefined} onClick={() => setSelected(null)}
        className={`flex min-h-12 items-center gap-2 rounded-control px-4 font-bold ${selected === undefined ? 'bg-lime text-on-lime' : 'glass text-muted'}`}><Plus aria-hidden className="size-5" />{t('new')}</button>
    </header>
    <nav className="flex flex-wrap gap-2" aria-label={t('title')}>
      <Link href="/captain/library/foods" aria-current="page" className="min-h-12 rounded-control px-4 py-3 text-lime">{t('title')}</Link>
      <Link href="/captain/library/forms" className="min-h-12 rounded-control px-4 py-3 text-muted">{t('forms')}</Link>
    </nav>
    <div className="flex flex-wrap gap-2">{(['all', 'mine', 'global'] as const).map(value => <button key={value} type="button"
      aria-pressed={segment === value} onClick={() => { setSegment(value); setCursor(null); }}
      className={`min-h-12 rounded-control border border-line px-4 ${segment === value ? 'glass-strong text-lime' : 'text-muted'}`}>
      {t(value)} {resource.data?.counts[value] ?? ''}
    </button>)}</div>
    {(resource.status === 'loading' || resource.status === 'idle') && <p role="status">{t('loading')}</p>}
    {Boolean(resource.error) && <div role="alert"><p>{t('error')}</p><button type="button" className="min-h-12 text-lime" onClick={() => void resource.retry()}>{t('retry')}</button></div>}
    {resource.data && <FoodsTable foods={resource.data.foods} onSelect={setSelected} />}
    <div className="flex gap-3">
      {cursor && <button type="button" className="min-h-12 px-4" onClick={() => setCursor(null)}>{t('first')}</button>}
      {resource.data?.cursor && <button type="button" className="min-h-12 px-4" disabled={resource.status === 'loading'} onClick={() => setCursor(resource.data?.cursor ?? null)}>{t('next')}</button>}
    </div>
    {selected !== undefined && <FoodDrawer key={selected?.id ?? 'new'} food={selected} onClose={() => setSelected(undefined)}
      onMutation={(next, commit) => resource.mutate(current => {
        const page = current ?? { foods: [], cursor: null, counts: { all: 0, mine: 0, global: 0 } };
        const editing = next?.id === selected?.id;
        const foods = page.foods.filter(row => row.id !== (editing || !next ? selected?.id : next.id));
        if (next && segment !== 'global') foods.unshift({ ...next, uses: editing ? selected?.uses ?? 0 : 0,
          alternativeUses: editing ? selected?.alternativeUses ?? 0 : 0 });
        const delta = next ? editing ? 0 : 1 : -1;
        return { ...page, foods: foods.slice(0, 40), counts: { ...page.counts, all: page.counts.all + delta, mine: page.counts.mine + delta } };
      }, commit)} onSaved={(food, optimisticId) => {
      setSelected(undefined);
      if (food) {
        void resource.mutate(current => ({ ...current ?? { cursor: null, counts: { all: 0, mine: 0, global: 0 } },
          foods: (current?.foods ?? []).map(row => row.id === optimisticId ? { ...row, ...food } : row),
        }), async () => {}).then(() => resource.retry());
      } else void resource.retry();
    }} />}
  </section>;
}

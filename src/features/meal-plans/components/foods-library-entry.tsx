'use client';

import { KoPlus } from '@/ui/icons/ko-plus';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { Plus, Search } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { listLibraryFoods } from '../data/food-library';
import type { FoodSegment, LibraryFood } from '../data/library-types';
import { messages } from './library/messages';
import { FoodsTable } from './library/foods-table';
import { Chip } from '@/ui/chip';
import { LoadingState } from '@/ui/loading-state';

const FoodDrawer = dynamic(() => import('./library/food-drawer').then(module => module.FoodDrawer));

export function FoodsLibraryEntry() {
  const PlusIcon = captainWorkspaceEnabled() ? KoPlus : Plus;
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
      <div className="me-auto"><h1 className="font-display text-[30px] font-semibold leading-tight">{t('title')}</h1><p className="mt-1 text-sm text-muted">{t('subtitle')}</p></div>
      <button id="new-library-food" type="button" disabled={selected !== undefined} onClick={() => setSelected(null)}
        className={`flex min-h-12 items-center gap-2 rounded-full px-5 font-semibold ${selected === undefined ? 'bg-lime text-on-lime' : 'glass text-muted'}`}><PlusIcon aria-hidden className="size-5" />{t('new')}</button>
    </header>
    <div className="flex flex-wrap items-center gap-2">{(['all', 'mine', 'global'] as const).map(value => <Chip key={value}
      pressed={segment === value} onClick={() => { setSegment(value); setCursor(null); }}
      className={segment === value ? '!border-ink !bg-ink !text-bg-deep' : 'bg-transparent text-muted'}>
      {t(value)} <b className="ms-1 font-display tabular-nums opacity-60">{resource.data?.counts[value] ?? ''}</b>
    </Chip>)}
      <form className="ms-auto flex w-full items-center gap-2 rounded-full border border-line-soft px-3 sm:w-auto" onSubmit={event => {
        event.preventDefault(); setCursor(null); setSearch(query.trim());
      }}>
        <input maxLength={100} className="min-h-12 min-w-0 flex-1 bg-transparent text-xs" aria-label={t('search')} placeholder={t('search')} value={query} onChange={e => setQuery(e.target.value)} />
        <button type="submit" className="flex min-h-12 min-w-12 items-center justify-center" aria-label={t('search')}><Search aria-hidden className="size-4 text-faint" /></button>
      </form>
    </div>
    {(resource.status === 'loading' || resource.status === 'idle') && <div role="status"><span className="sr-only">{t('loading')}</span><LoadingState variant="list" /></div>}
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

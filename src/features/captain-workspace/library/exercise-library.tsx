'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import type { LibraryExercise } from '@/features/programs';
import { Button } from '@/ui/button';
import { Chip } from '@/ui/chip';
import { KoPlus } from '@/ui/icons/ko-plus';
import { LoadingState } from '@/ui/loading-state';
import { ExerciseCard, equipmentChips, muscleBodyParts, muscleTabs } from './exercise-card';
import type { MuscleTab } from './exercise-card';
import { searchLibraryExercises } from './data/search';
import { messages } from './messages';

// The detail sheet opens only on tap, so it stays out of the first load.
const ExerciseDetail = dynamic(() => import('./exercise-detail').then(module => module.ExerciseDetail));

type Filters = { query: string; muscle: MuscleTab; equipment: typeof equipmentChips[number] | ''; mine: boolean; page: number };
const initialFilters: Filters = { query: '', muscle: 'all', equipment: '', mine: false, page: 0 };

export function exerciseSearchOptions(filters: Filters): Parameters<typeof searchLibraryExercises>[0] {
  const equipment = filters.equipment === 'machine' ? ['machine', 'leverage machine', 'smith machine', 'sled machine'] :
    filters.equipment === 'bodyweight' ? ['bodyweight', 'body weight'] : filters.equipment ? [filters.equipment] : [];
  return { query: filters.query, bodyPart: '', bodyParts: muscleBodyParts(filters.muscle), equipment,
    mine: filters.mine, page: filters.page, limit: 30 };
}

export function emptyMessage(mine: boolean, query: string, filtered = false) {
  return mine && !query.trim() && !filtered ? 'emptyMine' : 'empty';
}

export function ExerciseLibrary() {
  const t = useT(messages);
  const [filters, setFilters] = useState(initialFilters);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<LibraryExercise | null>(null);
  const { query: search, muscle, equipment, mine, page } = filters;
  const load = useCallback(async () => {
    const result = await searchLibraryExercises(exerciseSearchOptions({ query: search, muscle, equipment, mine, page }));
    if (result.error || !result.data) throw new Error(t('error'));
    return { data: result.data, total: result.total ?? 0 };
  }, [search, muscle, equipment, mine, page, t]);
  const resource = useResource(`exercise-library:${JSON.stringify(filters)}`, load);
  const changeFilter = (patch: Partial<Filters>) => setFilters(current => ({ ...current, ...patch, page: 0 }));
  const loading = resource.status === 'loading' || resource.status === 'idle';
  const rows = resource.data?.data.filter(row => !row.archived_at && (!mine || row.is_own)) ?? [];
  const total = resource.data?.total;
  return <section className="grid min-w-0 gap-5">
    <header className="flex flex-wrap items-center gap-4">
      <h1 className="me-auto flex items-center gap-3 text-2xl font-bold">{t('title')}
        {total !== undefined && <span dir="ltr" aria-label={t('count', { count: total })} className="font-display text-sm font-medium tabular-nums text-muted">{total.toLocaleString('en')}</span>}
      </h1>
      <Link id="new-library-exercise" href="/captain/library/exercises/new"
        className="inline-flex min-h-12 items-center gap-2 rounded-full bg-lime px-5 font-semibold text-on-lime">
        <KoPlus aria-hidden className="size-5" />{t('new')}
      </Link>
    </header>
    <form className="flex items-center gap-2 rounded-full border border-line-soft px-3" onSubmit={event => {
      event.preventDefault(); changeFilter({ query: query.trim() });
    }}>
      <input type="search" maxLength={120} value={query} onChange={event => {
        setQuery(event.target.value); if (!event.target.value) changeFilter({ query: '' });
      }} aria-label={t('search')} placeholder={t('search')} className="min-h-12 min-w-0 flex-1 bg-transparent text-sm" />
      <button type="submit" aria-label={t('search')} className="flex min-h-12 min-w-12 items-center justify-center">
        <Search aria-hidden strokeWidth={1.5} className="size-5 text-muted" />
      </button>
    </form>
    <div role="group" aria-label={t('target')} className="flex gap-1 overflow-x-auto border-b border-line-soft">
      {muscleTabs.map(tab => <button key={tab} type="button" aria-pressed={muscle === tab}
        onClick={() => changeFilter({ muscle: tab })}
        className={`min-h-12 shrink-0 border-b-2 px-4 text-sm ${muscle === tab ? 'border-lime text-ink' : 'border-transparent text-muted'}`}>{t(tab)}</button>)}
    </div>
    <div role="group" aria-label={t('equipment')} className="flex flex-wrap gap-2">
      <Chip pressed={!equipment} onClick={() => changeFilter({ equipment: '' })}>{t('allEquipment')}</Chip>
      {equipmentChips.map(chip => <Chip key={chip} pressed={equipment === chip}
        onClick={() => changeFilter({ equipment: equipment === chip ? '' : chip })}>{t(chip)}</Chip>)}
      <Chip pressed={mine} onClick={() => changeFilter({ mine: !mine })}>{t('mine')}</Chip>
    </div>
    {loading && <div role="status"><span className="sr-only">{t('loading')}</span><LoadingState variant="cards" /></div>}
    {Boolean(resource.error) && <div role="alert" className="glass rounded-card p-5">
      <p>{t('error')}</p><Button type="button" variant="secondary" onClick={() => void resource.retry()}>{t('retry')}</Button>
    </div>}
    {!loading && !resource.error && resource.data && (rows.length ?
      <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-4">{rows.map(exercise => <li key={exercise.id} className="flex">
        <ExerciseCard exercise={exercise} onSelect={setSelected} />
      </li>)}</ul> : <p role="status" className="glass rounded-card p-6 text-muted">{t(emptyMessage(mine, search, muscle !== 'all' || Boolean(equipment)))}</p>)}
    <div className="flex items-center gap-3">
      <Button type="button" variant="secondary" disabled={page === 0 || loading}
        onClick={() => setFilters(current => ({ ...current, page: Math.max(0, current.page - 1) }))}>{t('previous')}</Button>
      <Button type="button" variant="secondary" disabled={loading || Boolean(resource.error) || total === undefined || (page + 1) * 30 >= total}
        onClick={() => setFilters(current => ({ ...current, page: current.page + 1 }))}>{t('next')}</Button>
    </div>
    {selected && <ExerciseDetail exercise={selected} onClose={() => setSelected(null)} />}
  </section>;
}

'use client';

import { editableFieldClass } from '@/ui/edit-in-place';
import { rowLinkClass } from '@/ui/row-link';
import { clickableClass } from '@/ui/button';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { Search } from 'lucide-react';
import { useCallback, useState } from 'react';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import type { LibraryExercise } from '@/features/programs';
import { Button, buttonClass } from '@/ui/button';
import { Chip } from '@/ui/chip';
import { KoPlus } from '@/ui/icons/ko-plus';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { RowChevron } from '@/ui/row-chevron';
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
  const enabled = captainWorkspaceEnabled();
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
  return <section className="grid min-w-0 gap-card-gap">
    <header data-captain-phone-heading={enabled || undefined}
      className={enabled ? 'flex flex-wrap items-center gap-card-gap max-md:flex-nowrap max-md:gap-inline' : 'flex flex-wrap items-center gap-card-gap'}>
      {enabled && <Link href="/captain" aria-label={t('returnToCaptain')} className={buttonClass({ variant: 'secondary', block: false, className: 'min-w-12 shrink-0 px-stack md:hidden' })}><RowChevron className="rotate-180" /></Link>}
      <div className={enabled ? 'me-auto max-md:min-w-0 max-md:[&>*]:truncate' : 'me-auto'}>
        <h1 className="text-h font-bold">{enabled ? <><span className="max-md:hidden">{t('title')}</span><span className="md:hidden">{t('shortTitle')}</span></> : t('title')}</h1>
        {total !== undefined && <p className="text-xs text-muted">{t('count', { count: total.toLocaleString('en') })}</p>}
      </div>
      <Link id="new-library-exercise" href="/captain/library/exercises/new" aria-label={enabled ? t('new') : undefined}
        className={buttonClass({ variant: 'primary', block: false, className: `inline-flex min-h-12 items-center gap-inline px-page-x font-semibold ${enabled ? 'max-md:min-w-12 max-md:shrink-0 max-md:px-stack!' : ''}` })}>
        <KoPlus aria-hidden className={enabled ? 'size-5 max-md:text-on-lime!' : 'size-5'} />{enabled ? <span className="max-md:sr-only">{t('new')}</span> : t('new')}
      </Link>
    </header>
    <div className="flex min-w-0 flex-wrap items-center gap-stack">
    <form className={`flex min-w-0 w-full items-center gap-inline rounded-control border border-line-soft bg-bg-deep px-stack min-[760px]:w-auto ${enabled ? 'max-md:w-full max-md:flex-row-reverse max-md:px-0' : ''}`} onSubmit={event => {
      event.preventDefault(); changeFilter({ query: query.trim() });
    }}>
      <input type="search" maxLength={120} value={query} onChange={event => {
        setQuery(event.target.value); if (!event.target.value) changeFilter({ query: '' });
      }} aria-label={t('search')} placeholder={t('search')} className={`${editableFieldClass} min-h-12 min-w-0 flex-1 bg-surface text-sm ${enabled ? 'max-md:bg-transparent max-md:pe-stack' : ''}`.trim()} />
      <button type="submit" aria-label={t('search')} className={`${rowLinkClass} flex min-h-12 min-w-12 items-center justify-center`}>
        <Search aria-hidden strokeWidth={1.5} className="size-5 text-muted" />
      </button>
    </form>
    <div role="group" aria-label={t('target')} className={`glass flex min-w-0 max-w-full gap-inline overflow-x-auto rounded-control ${enabled ? 'max-md:border-0 max-md:bg-none max-md:shadow-none' : ''}`.trim()}>
      {muscleTabs.map(tab => <button key={tab} type="button" aria-pressed={muscle === tab}
        onClick={() => changeFilter({ muscle: tab })}
        className={`${clickableClass} min-h-12 shrink-0 rounded-control px-stack text-xs ${muscle === tab ? 'glass-raised font-bold text-ink' : 'text-muted'}`}>{t(tab)}</button>)}
    </div>
    <div role="group" aria-label={t('equipment')} className="flex flex-wrap gap-inline">
      <Chip pressed={!equipment} onClick={() => changeFilter({ equipment: '' })}>{t('allEquipment')}</Chip>
      {equipmentChips.map(chip => <Chip key={chip} pressed={equipment === chip}
        onClick={() => changeFilter({ equipment: equipment === chip ? '' : chip })}>{t(chip)}</Chip>)}
      <Chip pressed={mine} onClick={() => changeFilter({ mine: !mine })}>{t('mine')}</Chip>
    </div>
    </div>
    {loading && <div role="status"><span className="sr-only">{t('loading')}</span><LoadingState variant="cards" /></div>}
    {Boolean(resource.error) && <div role="alert" className="glass rounded-card p-card">
      <p>{t('error')}</p><Button type="button" variant="secondary" onClick={() => void resource.retry()}>{t('retry')}</Button>
    </div>}
    {!loading && !resource.error && resource.data && (rows.length ?
      <ul className={`grid grid-cols-1 gap-card-gap min-[760px]:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 ${enabled ? 'max-md:grid-cols-1!' : ''}`.trim()}>{rows.map(exercise => <li key={exercise.id} className="flex min-w-0">
        <ExerciseCard exercise={exercise} onSelect={setSelected} />
      </li>)}</ul> : <p role="status" className="glass rounded-card p-section text-muted">{t(emptyMessage(mine, search, muscle !== 'all' || Boolean(equipment)))}</p>)}
    <div className="flex items-center gap-stack">
      <Button type="button" variant="secondary" disabled={page === 0 || loading}
        onClick={() => setFilters(current => ({ ...current, page: Math.max(0, current.page - 1) }))}>{t('previous')}</Button>
      <Button type="button" variant="secondary" disabled={loading || Boolean(resource.error) || total === undefined || (page + 1) * 30 >= total}
        onClick={() => setFilters(current => ({ ...current, page: current.page + 1 }))}>{t('next')}</Button>
    </div>
    {selected && <ExerciseDetail exercise={selected} onClose={() => setSelected(null)} />}
  </section>;
}

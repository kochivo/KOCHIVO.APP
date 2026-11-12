'use client';

import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { Chip } from '@/ui/chip';
import { suggestedExercises } from '@/features/programs';
import type { DraftDay, LibraryExercise } from '@/features/programs';
import { loadSuggestions, loadTrainingSearch } from './data/library';
import { messages } from './messages';

export function InlineSearch({ day, onAdd }: { day: DraftDay; onAdd: (row: LibraryExercise) => void }) {
  const t = useT(messages);
  const [query, setQuery] = useState(''), [debounced, setDebounced] = useState('');
  useEffect(() => { const timer = setTimeout(() => setDebounced(query), 250); return () => clearTimeout(timer); }, [query]);
  const load = useCallback(() => loadTrainingSearch(debounced), [debounced]);
  const search = useResource(query.trim() ? `training-search:${debounced}` : null, load);
  const existing = [...new Set(day.exercises.flatMap(row => row.library?.body_part ?? []))].sort().join('|');
  const suggest = useCallback(() => loadSuggestions(day.title, existing.split('|')), [day.title, existing]);
  const suggestions = useResource(`training-suggestions:${day.title}:${existing}`, suggest);
  const rows = suggestedExercises(day.title, day.exercises.map(row => row.exercise_id), suggestions.data ?? [], existing.split('|'));
  return <div>
    <label className="flex min-h-16 items-center gap-2.5 border-t border-dashed border-line px-4 py-3 text-faint">
      <Search aria-hidden className="size-5 shrink-0" />
      <input aria-label={t('search')} placeholder={t('search')} value={query} onChange={event => setQuery(event.target.value)}
        className="min-h-12 min-w-0 flex-1 bg-transparent text-[12.5px] text-ink outline-none placeholder:text-faint focus-visible:ring-1 focus-visible:ring-lime" />
    </label>
    {query.trim() && <div className="max-h-64 overflow-y-auto px-4 pb-3">
      {search.error ? <p role="alert" className="text-danger">{t('error')}<button className="min-h-12 px-3" onClick={() => void search.retry()}>{t('retry')}</button></p> :
        !search.data || query !== debounced ? <p role="status" className="text-faint">{t('loading')}</p> :
          search.data.length ? search.data.map(row => <button key={row.id} className="flex min-h-12 w-full items-center border-t border-line-soft text-start"
            onClick={() => { onAdd(row); setQuery(''); }}><bdi>{t('add', { name: row.name_en || row.name_ar || t('noResults') })}</bdi></button>) : <p className="text-faint">{t('noResults')}</p>}
    </div>}
    <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3.5 text-xs text-faint">
      <span>{t('suggestions', { day: day.title })}</span>
      {suggestions.error ? <p role="alert">{t('error')}<button className="min-h-12" onClick={() => void suggestions.retry()}>{t('retry')}</button></p> :
        !suggestions.data ? <span role="status">{t('loading')}</span> : rows.length ?
          rows.map(row => <Chip key={row.id} pressed={false} className="border-transparent bg-surface/50 px-3 text-xs" onClick={() => onAdd(row)}>{t('add', { name: row.name_en || row.name_ar || t('noResults') })}</Chip>) : <span>{t('noResults')}</span>}
    </div>
  </div>;
}

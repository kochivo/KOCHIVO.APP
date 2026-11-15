'use client';

import { editableFieldClass } from '@/ui/edit-in-place';
import { Disclosure } from '@/ui/disclosure';
import { useCallback, useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { Chip } from '@/ui/chip';
import { suggestedExercises, programMessages } from '@/features/programs';
import type { DraftDay, LibraryExercise } from '@/features/programs';
import { loadSuggestions, loadTrainingSearch } from './data/library';
import { messages } from './messages';
import { CustomExercise } from './custom-exercise';
import { removeCustom } from './data/editor-actions';
import { Button } from '@/ui/button';

export function InlineSearch({ day, onAdd, onLibraryChange, excluded = [], disabled = false }: {
  day: DraftDay; onAdd: (row: LibraryExercise) => void; onLibraryChange: (row: LibraryExercise) => void;
  excluded?: string[]; disabled?: boolean;
}) {
  const t = useT(messages), pt = useT(programMessages);
  const [query, setQuery] = useState(''), [debounced, setDebounced] = useState('');
  const [browsing, setBrowsing] = useState(false), [mine, setMine] = useState(false), [part, setPart] = useState('');
  const [removed, setRemoved] = useState<string[]>([]), [busy, setBusy] = useState<string[]>([]), [error, setError] = useState('');
  useEffect(() => { const timer = setTimeout(() => setDebounced(query), 250); return () => clearTimeout(timer); }, [query]);
  const load = useCallback(() => loadTrainingSearch(debounced, part, mine), [debounced, part, mine]);
  const search = useResource(query.trim() || browsing ? `training-search:${debounced}:${part}:${mine}` : null, load);
  const existing = [...new Set(day.exercises.flatMap(row => row.library?.body_part ?? []))].sort().join('|');
  const suggest = useCallback(() => loadSuggestions(day.title, existing.split('|')), [day.title, existing]);
  const suggestions = useResource(`training-suggestions:${day.title}:${existing}`, suggest);
  const rows = suggestedExercises(day.title, [...day.exercises.map(row => row.exercise_id), ...excluded], suggestions.data ?? [], existing.split('|'));
  const results = search.data?.filter(row => !removed.includes(row.id) && !excluded.includes(row.id));
  return <div>
    <label className="flex min-h-16 items-center gap-2.5 border-t border-dashed border-line px-4 py-3 text-faint">
      <Search aria-hidden className="size-5 shrink-0" />
      <input aria-label={t('search')} placeholder={t('search')} value={query} onChange={event => setQuery(event.target.value)}
        className={`${editableFieldClass} min-h-12 min-w-0 flex-1 bg-surface text-[12.5px] text-ink outline-none placeholder:text-faint focus-visible:ring-1 focus-visible:ring-lime`} />
    </label>
    <Disclosure label={pt('exerciseLibrary')} className="mx-4 text-xs text-muted" onToggle={event => setBrowsing(event.currentTarget.open)}>
      <label className="flex min-h-12 items-center gap-2"><input type="checkbox" className={`${editableFieldClass} size-5 accent-lime`} checked={mine} onChange={event => setMine(event.target.checked)} />{pt('myExercises')}</label>
      <select aria-label={pt('bodyPart')} value={part} className={`${editableFieldClass} min-h-12 w-full bg-surface`} onChange={event => setPart(event.target.value)}>
        <option value="">{pt('all')}</option>{([['chest', 'chest'], ['back', 'back'], ['upper legs', 'thighs'], ['lower legs', 'calves'], ['shoulders', 'shoulders'], ['upper arms', 'upperArms'], ['lower arms', 'forearms'], ['waist', 'abs'], ['core', 'core'], ['glutes', 'glutes'], ['cardio', 'cardio'], ['neck', 'neck']] as const).map(([value, label]) => <option key={value} value={value}>{pt(label)}</option>)}
      </select>
    </Disclosure>
    {error && <p role="alert" className="px-4 text-xs text-danger">{error}</p>}
    {(query.trim() || browsing) && <div className="max-h-64 overflow-y-auto px-4 pb-3">
      {search.error ? <p role="alert" className="text-danger">{t('error')}<Button type="submit" variant={'secondary'} block={false} className={"min-h-12 px-3"} onClick={() => void search.retry()}>{t('retry')}</Button></p> :
        !search.data || query !== debounced ? <p role="status" className="text-faint">{t('loading')}</p> :
          results?.length ? results.map(row => <div key={row.id}>
            <Button disabled={disabled || busy.includes(row.id)} type="submit" variant={'secondary'} block={false} className={"my-2 flex min-h-12 w-full items-center px-3 text-start disabled:opacity-40"} onClick={() => { onAdd(row); setQuery(''); }}><bdi>{t('add', { name: row.name_ar || row.name_en || t('noResults') })}</bdi></Button>
            {row.is_own && <div className="flex flex-wrap items-center gap-2"><CustomExercise key={`${row.id}-${row.name_ar}`} exercise={row} onAdd={next => { onLibraryChange(next); void search.retry(); }} />
              <Button disabled={busy.includes(row.id)} type="submit" variant={'secondary'} block={false} className={"min-h-12 px-3 text-xs text-danger"} onClick={() => { void (async () => { setBusy(ids => [...ids, row.id]); setError(''); try { const result = await removeCustom(row.id); if (result.error) setError(result.error); else setRemoved(ids => [...ids, row.id]); } catch { setError(t('error')); } finally { setBusy(ids => ids.filter(id => id !== row.id)); } })(); }}>{pt('deleteCustomExercise')}</Button></div>}
          </div>) : <p className="text-faint">{t('noResults')}</p>}
    </div>}
    <div className="flex flex-wrap items-center gap-1.5 px-4 pb-3.5 text-xs text-faint">
      <span>{t('suggestions', { day: day.title })}</span>
      {suggestions.error ? <p role="alert">{t('error')}<Button type="submit" variant={'secondary'} block={false} className={"min-h-12 px-3"} onClick={() => void suggestions.retry()}>{t('retry')}</Button></p> :
        !suggestions.data ? <span role="status">{t('loading')}</span> : rows.length ?
          rows.map(row => <Chip key={row.id} disabled={disabled} pressed={false} className="border-transparent bg-surface/50 px-3 text-xs" onClick={() => onAdd(row)}>{t('add', { name: row.name_ar || row.name_en || t('noResults') })}</Chip>) : <span>{t('noResults')}</span>}
    </div>
  </div>;
}

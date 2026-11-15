'use client';

import { editableFieldClass } from '@/ui/edit-in-place';
import { useCallback, useEffect, useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { uuidv7 } from '@/core/offline/ids';
import { useResource } from '@/core/resource';
import type { WarmupItem } from '@/features/programs';
import { loadTrainingSearch } from './data/library';
import { messages } from './editor/messages';
import { Button } from '@/ui/button';

export function WarmupLibraryPicker({ items, onAdd }: { items: WarmupItem[]; onAdd: (item: WarmupItem) => void }) {
  const t = useT(messages), locale = useLocale();
  const [query, setQuery] = useState(''), [debounced, setDebounced] = useState('');
  const [mine, setMine] = useState(true);
  useEffect(() => { const timer = setTimeout(() => setDebounced(query), 250); return () => clearTimeout(timer); }, [query]);
  const load = useCallback(() => loadTrainingSearch(debounced, '', mine), [debounced, mine]);
  const search = useResource(`training-search:${debounced}::${mine}`, load);
  return <div className="mx-[18px] mb-3 rounded-control border border-line-soft p-3">
    <input aria-label={t('warmSearch')} placeholder={t('warmSearch')} value={query} onChange={event => setQuery(event.target.value)}
      className={`${editableFieldClass} min-h-12 w-full rounded-control border border-line-soft bg-surface px-3 text-sm`} />
    <label className="flex min-h-12 items-center gap-2 text-xs text-muted"><input type="checkbox" checked={mine}
      onChange={event => setMine(event.target.checked)} className={`${editableFieldClass} size-5 accent-lime`} />{t('warmMine')}</label>
    <div className="max-h-64 overflow-y-auto">
      {search.error ? <p role="alert" className="text-xs text-danger">{t('warmSearchError')}<Button type="button" variant={'secondary'} block={false} className={"min-h-12 px-3"} onClick={() => void search.retry()}>{t('warmRetry')}</Button></p> :
        !search.data || query !== debounced ? <p role="status" className="text-xs text-faint">{t('warmLoading')}</p> :
          search.data.length ? search.data.map(row => {
            const name = ((locale === 'en' ? row.name_en || row.name_ar : row.name_ar || row.name_en) || '').trim().slice(0, 60);
            const added = items.some(item => item.exerciseId === row.id), disabled = added || items.length >= 12;
            return <Button key={row.id} type="button" disabled={disabled} aria-label={t(added ? 'warmAdded' : 'warmAddExercise', { name })}
              variant={'secondary'} block={false} className={"my-2 flex min-h-12 w-full items-center px-3 text-start text-sm disabled:opacity-40"}
              onClick={() => { if (!disabled) onAdd({ id: uuidv7(), name, amount: 10, unit: 'reps', exerciseId: row.id }); }}>
              <bdi>{added ? t('warmAdded', { name }) : name}</bdi>
            </Button>;
          }) : <p className="text-xs text-faint">{t(mine && !debounced.trim() ? 'warmMineEmpty' : 'warmNoResults')}</p>}
    </div>
  </div>;
}

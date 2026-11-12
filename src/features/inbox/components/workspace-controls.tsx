'use client';
import { Search } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import type { TaskKind } from '../workspace-model';
import type { FollowupStatus } from '../workspace-followup';
import { workspaceMessages } from '../workspace-messages';
export function WorkspaceControls({ summary, counts, kind, status, search, onKind, onStatus, onSearch }: {
  summary: string; counts: Record<FollowupStatus, number>; kind: TaskKind | 'all'; status: FollowupStatus; search: string;
  onKind: (kind: TaskKind | 'all') => void; onStatus: (status: FollowupStatus) => void; onSearch: (search: string) => void;
}) {
  const t = useT(workspaceMessages), locale = useLocale();
  return <>
    <header className="flex flex-wrap items-center justify-between gap-3.5">
      <div><h1 id="tasks-heading" tabIndex={-1} className="font-display text-[30px] font-semibold leading-tight">{t('title')}</h1>
        {summary && <p className="mt-1 text-[13px] text-muted">{summary}</p>}</div>
      <label className="flex min-h-12 w-full items-center gap-2 rounded-full border border-line px-3.5 text-faint sm:w-[220px]">
        <Search className="size-4 shrink-0" strokeWidth={1.5} aria-hidden />
        <input type="search" aria-label={t('search')} placeholder={t('search')} value={search} onChange={event => onSearch(event.target.value)}
          className="min-h-12 w-full min-w-0 bg-transparent text-[13px] text-ink outline-none placeholder:text-faint" />
      </label>
    </header>
    <div className="flex flex-wrap items-center gap-2.5">
      <div role="group" aria-label={t('status')} className="inline-flex max-w-full flex-wrap gap-1 rounded-[26px] border border-line p-1">
        {(['waiting', 'overdue', 'completed'] as const).map(value => <button key={value} aria-pressed={status === value} onClick={() => onStatus(value)}
          className={`inline-flex min-h-12 items-center gap-2 rounded-full px-3 text-[13px] ${status === value ? 'bg-ink text-bg' : 'text-muted'}`}>
          {t(value)}<b className={`grid size-[22px] place-items-center rounded-full font-display text-xs font-extrabold tabular-nums ${status === value ? 'bg-bg text-ink' : value === 'overdue' ? 'bg-warn-soft text-warn' : 'bg-surface-raised'}`}>{formatNumber(counts[value], locale)}</b>
        </button>)}
      </div>
      <div role="group" aria-label={t('types')} className="flex flex-wrap gap-1.5">
        {(['all', 'checkin', 'form', 'assessment', 'request'] as const).map(value => <button key={value} aria-pressed={kind === value} onClick={() => onKind(value)}
          className={`min-h-12 rounded-full border px-3 text-[12.5px] ${kind === value ? 'border-lime text-lime' : 'border-line-soft text-muted'}`}>{t(value)}</button>)}
      </div>
    </div>
  </>;
}

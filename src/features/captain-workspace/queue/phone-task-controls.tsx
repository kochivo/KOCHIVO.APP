'use client';
import { useCallback, useState } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, MessageCircle, Search } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { formatNumber } from '@/lib/format';
import { Button, buttonClass, clickableClass } from '@/ui/button';
import { loadQueueCounts } from './data/counts';
import { taskMessages } from './messages';
import { phoneTaskMessages } from './phone/messages';
import { taskTabs } from './tasks-model';
import type { TaskFilter } from './tasks-model';

export function PhoneTaskControls({ at, open, counts, filter, onFilter, search, onSearch, index, total, pending, onMove, children }: {
  at: string; open: number; counts: Record<TaskFilter, number>; filter: TaskFilter; onFilter: (value: string) => void;
  search: string; onSearch: (value: string) => void; index: number; total: number; pending: boolean;
  onMove: (step: number) => void; children: ReactNode;
}) {
  const t = useT(phoneTaskMessages), copy = useT(taskMessages), locale = useLocale();
  const [searchOpen, setSearchOpen] = useState(false);
  const number = (value: number) => formatNumber(value, locale);
  const load = useCallback(() => loadQueueCounts(at), [at]);
  const count = useResource(`phone-task-counts:${locale}:${at}`, load);
  const done = count.data?.reviewed;
  const segments = done === undefined ? 0 : Math.min(10, open + done);
  const filled = done === undefined || segments === 0 ? 0 : Math.round(segments * done / (open + done));
  return <div className="flex flex-col gap-card-gap">
    <header className="flex min-h-12 items-center gap-inline">
      <div className="min-w-0 flex-1">
        <h1 className="text-h font-bold">{copy('title')}</h1>
        <p className="text-xs text-muted" aria-live="polite">
          {t('waiting', { count: number(open) })}
          {done !== undefined && <> · {t('done', { count: number(done) })}</>}
        </p>
      </div>
      <Button variant="secondary" block={false} className="size-12 p-0" aria-label={t('search')} aria-expanded={searchOpen}
        onClick={() => { if (searchOpen) onSearch(''); setSearchOpen(!searchOpen); }}><Search aria-hidden className="size-5" /></Button>
      <Link href={`/${locale}/captain/inbox`} aria-label={t('inbox')} className={buttonClass({ variant: 'secondary', block: false, className: 'size-12 p-0' })}>
        <MessageCircle aria-hidden className="size-5" /></Link>
    </header>
    {Boolean(count.error) && <div className="flex items-center justify-between gap-stack" role="alert"><p className="text-xs text-danger">{copy('error')}</p>
      <Button variant="secondary" block={false} onClick={() => void count.retry()}>{copy('retry')}</Button></div>}
    {segments > 0 && <div aria-hidden className="flex gap-inline">{Array.from({ length: segments }, (_, segment) =>
      <span key={segment} className={`h-1 flex-1 rounded-full ${segment < filled ? 'bg-lime' : 'bg-line'}`} />)}</div>}
    {searchOpen && <input type="search" aria-label={t('search')} placeholder={t('search')} value={search} disabled={pending}
      onChange={event => onSearch(event.target.value)} className="glass min-h-12 w-full rounded-control px-stack text-sm" />}
    {children}
    {open > 0 && <div className="flex items-center gap-inline">
      <select aria-label={copy('filterByType')} value={filter} disabled={pending} onChange={event => onFilter(event.target.value)}
        className={`${clickableClass} glass min-h-12 min-w-0 flex-1 rounded-control px-stack text-xs`}>
        {taskTabs.map(tab => <option key={tab} value={tab}>{copy(tab)} ({number(counts[tab])})</option>)}
      </select>
      {total > 0 && <>
        <Button variant="secondary" block={false} className="size-12 p-0" disabled={pending || total < 2} aria-label={t('previous')}
          onClick={() => onMove(-1)}><ChevronLeft aria-hidden className="dir-icon size-5" /></Button>
        <span aria-live="polite" className="text-xs text-muted">{t('position', { current: number(index + 1), total: number(total) })}</span>
        <Button variant="secondary" block={false} className="size-12 p-0" disabled={pending || total < 2} aria-label={t('next')}
          onClick={() => onMove(1)}><ChevronRight aria-hidden className="dir-icon size-5" /></Button>
      </>}
    </div>}
  </div>;
}

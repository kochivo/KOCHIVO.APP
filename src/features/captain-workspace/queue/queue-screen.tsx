'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import type { InboxItem } from '@/features/inbox';
import { triage, nextOpenItem } from '@/features/inbox';
import { queueRow, sortQueue } from './model';
import { queueMetrics } from './metrics';
import { messages } from './messages';
import { useQueue } from './use-queue';
import { QueueState } from './queue-state';
import { QueueRow } from './queue-row';
import { Button } from '@/ui/button';
const Review = dynamic(() => import('./review-dialog').then(module => module.ReviewDialog));
export function QueueScreen() {
  const t = useT(messages), locale = useLocale();
  const resource = useQueue();
  const [filter, setFilter] = useState<'needsReply' | 'late' | 'reviewed' | 'all'>('needsReply');
  const [kind, setKind] = useState<'all' | 'checkin' | 'form' | 'renewal'>('all');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<InboxItem | null>(null);
  if (!resource.data) return <QueueState locale={locale} kind={resource.error ? 'error' : 'loading'} retry={resource.retry} />;
  const data = resource.data;
  const now = new Date(data.at ?? data.pages[0]?.at ?? '');
  const items = [...new Map([...data.pages.flatMap(page => page.items), ...data.reviews].map(item => [`${item.kind}:${item.id}`, item])).values()];
  const previous = Object.assign({}, ...data.pages.map(page => page.previous));
  const rows = sortQueue(items.map(item => queueRow(item, previous[item.id], now)));
  const metrics = { ...queueMetrics(rows, now), ...data.counts };
  const visible = rows.filter(row => (filter === 'all' || (filter === 'reviewed' ? !!row.item.reviewed_at
    : filter === 'late' ? row.late : !row.item.reviewed_at)) && (kind === 'all' || row.kind === kind)
    && row.player.name.toLocaleLowerCase(locale).includes(search.trim().toLocaleLowerCase(locale)));
  const last = data.pages.at(-1);
  return <div className="mx-auto max-w-7xl space-y-section">
    <header className="flex flex-wrap items-center justify-between gap-card-gap"><div>
      <p className="text-sm text-muted">{t('subtitle')}</p><h1 id="queue-heading" tabIndex={-1} className="text-3xl font-bold">{t('title')}</h1>
    </div><input aria-label={t('search')} placeholder={t('search')} type="search" value={search} onChange={event => setSearch(event.target.value)} className="glass min-h-12 rounded-full px-page-x" /></header>
    <div className="grid grid-cols-2 gap-card-gap lg:grid-cols-4">{(['needsReply', 'late', 'replyHours', 'reviewedWeek'] as const).map(key =>
      <div key={key} className="glass-strong rounded-card p-card"><p className="text-sm text-muted">{t(key)}</p>
        <p className={`mt-inline text-3xl font-bold tabular-nums ${key === 'needsReply' ? 'text-lime' : key === 'late' ? 'text-warn' : ''}`}>
          {metrics[key] === null ? t('unavailable') : key === 'replyHours' ? t('hours', { value: formatNumber(Math.round(metrics[key] * 10) / 10, locale) }) : formatNumber(metrics[key], locale)}</p>
        {key === 'replyHours' && metrics.comparison !== null && <p className="mt-inline text-sm text-muted">{t('comparison', { value: formatNumber(Math.round(metrics.comparison * 10) / 10, locale) })}</p>}
      </div>)}</div>
    <p className="text-xs text-muted">{t('sample')}</p>
    <div className="flex flex-wrap justify-between gap-card-gap"><div className="flex flex-wrap gap-inline">
      {(['needsReply', 'late', 'reviewed', 'all'] as const).map(value => <button key={value} aria-pressed={filter === value} onClick={() => setFilter(value)} className={`glass min-h-12 rounded-full px-page-x ${filter === value ? 'text-lime' : 'text-muted'}`}>
        {t(value)} <span className="ms-inline tabular-nums">{formatNumber(metrics[value], locale)}</span></button>)}
    </div><div className="glass flex flex-wrap rounded-full p-inline" aria-label={t('kind')}>
      {(['all', 'checkin', 'form', 'renewal'] as const).map(value => <button key={value} aria-pressed={kind === value} onClick={() => setKind(value)} className={`min-h-12 rounded-full px-page-x ${kind === value ? 'bg-surface-raised text-ink' : 'text-muted'}`}>{t(value)}</button>)}
    </div></div>
    {(resource.error || resource.moreError) && <QueueState locale={locale} kind="error" retry={resource.moreError ? resource.more : resource.retry} />}
    {!visible.length ? <QueueState locale={locale} kind="empty" /> : <ul aria-label={t('title')} className="space-y-stack lg:space-y-0">{visible.map(row =>
      <QueueRow key={`${row.kind}:${row.item.id}`} row={row} locale={locale}
        flags={row.item.kind === 'renewal' || row.item.kind === 'request' ? [] : triage(row.item, data.triage.history, data.triage.dailyChecks, now).flags}
        onReview={() => { if (!resource.pending && row.item.kind !== 'renewal' && row.item.kind !== 'request') setSelected(row.item); }} />)}</ul>}
    {(last?.cursor || last?.renewalCursor || last?.requestCursor) && <Button disabled={resource.pending || selected !== null} onClick={resource.more} type="submit" variant={'secondary'} block={false} className={"min-h-12 w-full px-page-x text-lime disabled:opacity-50"}>{resource.pending ? t('loading') : t('loadMore')}</Button>}
    {selected && <Review key={`${selected.kind}:${selected.id}`} item={selected} inputs={data.triage} now={now} onClose={() => setSelected(null)} onReviewed={async (reviewed, commit, advance) => {
      const next = advance ? nextOpenItem(items.filter((item): item is InboxItem => item.kind !== 'renewal' && item.kind !== 'request'), selected,
        item => triage(item, data.triage.history, data.triage.dailyChecks, now)) : null;
      const ok = await resource.mutate(current => current ? { ...current, at: reviewed.reviewed_at ?? current.at,
        counts: { ...current.counts, needsReply: Math.max(0, current.counts.needsReply - 1),
          late: Math.max(0, current.counts.late - Number(queueRow(selected, previous[selected.id], now).late)),
          reviewed: current.counts.reviewed + 1, reviewedWeek: current.counts.reviewedWeek + 1 },
        reviews: [...current.reviews.filter(item => item.id !== reviewed.id || item.kind !== reviewed.kind), reviewed] } : data, commit);
      if (!ok) throw new Error(t('error'));
      setSelected(next);
    }} />}
  </div>;
}

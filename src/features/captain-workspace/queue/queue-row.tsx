import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { formatNumber } from '@/lib/format';
import type { QueueRow as Row } from './model';
import { messages } from './messages';
import Link from 'next/link';
import { FlagChip } from '@/features/inbox';
import type { TriageFlag } from '@/features/inbox';
export function QueueRow({ row, locale, onReview, flags = [] }: { row: Row; locale: Locale; onReview: () => void; flags?: TriageFlag[] }) {
  const t = createT(messages, locale);
  return <li className="glass grid gap-3 rounded-card p-4 lg:grid-cols-[1.3fr_1fr_1.6fr_1fr_auto] lg:items-center lg:rounded-none">
    <div className="flex items-center gap-3"><span aria-hidden className="glass-strong grid size-10 place-items-center rounded-full">{row.player.name.slice(0, 1)}</span><strong>{row.player.name}</strong></div>
    <p className="text-sm text-muted">{row.item.kind === 'request' ? row.item.title : t(row.kind)}</p>
    <div className="flex flex-wrap gap-2">{row.kind === 'renewal' ? <span className="text-warn">{t('ending')}</span> : row.changes.map(change =>
      <span key={change.key} className={`rounded-full px-3 py-1 text-xs ${change.style === 'danger' ? 'bg-danger-soft text-danger' : change.style === 'warn' ? 'bg-warn-soft text-warn' : 'glass text-muted'}`}>
        {change.delta === undefined ? t(change.key) : <bdi dir="ltr">{t(change.key, { value: `${change.delta > 0 ? '+' : ''}${formatNumber(change.delta, locale)}` })}</bdi>}
      </span>)}{flags.slice(0, Math.max(0, 3 - row.changes.length)).map(flag => <FlagChip key={flag.key} flag={flag} />)}</div>
    <p className={`text-sm tabular-nums ${row.late ? 'text-warn' : 'text-muted'}`}>{t('hours', { value: formatNumber(Math.floor(row.ageHours), locale) })}</p>
    {row.item.kind === 'request' ? <Link href={`/${locale}/captain/players/${row.player.id}/programs?view=forms&requestId=${row.item.id}`} className="flex min-h-12 items-center rounded-control bg-lime-soft px-5 font-bold text-lime">{t('review')}</Link> :
      row.kind === 'renewal' ? <Link href={`/captain/players/${row.player.id}`} className="flex min-h-12 items-center rounded-control bg-lime-soft px-5 font-bold text-lime">{t('review')}</Link> :
      <button id={`queue-${row.kind}-${row.item.id}`} onClick={onReview} className="min-h-12 rounded-control bg-lime-soft px-5 font-bold text-lime">{t('review')}</button>}
  </li>;
}

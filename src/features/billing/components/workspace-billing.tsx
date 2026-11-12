'use client';
import { use, useState, useTransition } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/button';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { messages as legacyMessages } from '../messages';
import { messages } from '../payments/messages';
import type { BillingResult } from '../types';
import { endingThisWeek, paymentSegment, paymentSegments, segmentCounts } from '../workspace';
import type { PaymentSegment } from '../workspace';
import { WorkspaceBillingRow } from './workspace-billing-row';
import { FinanceSummary } from './finance-summary';
import { WorkspacePackages } from './workspace-packages';

const Picker = dynamic(() => import('./payment-player-picker').then(m => m.PaymentPlayerPicker));
const Detail = dynamic(() => import('./workspace-player-detail').then(m => m.WorkspacePlayerDetail));
export function WorkspaceBilling({ data, today }: { data: Promise<BillingResult>; today: string }) {
  const result = use(data), t = useT(messages), legacy = useT(legacyMessages), locale = useLocale(), router = useRouter();
  const [pending, start] = useTransition();
  const [packages, setPackages] = useState(result.data?.packages ?? []);
  const [segment, setSegment] = useState<PaymentSegment>('all'), [search, setSearch] = useState('');
  const [picking, setPicking] = useState(false), [selectedId, setSelectedId] = useState<string | null>(null);
  const billing = result.data;
  if (!billing) return <ErrorState message={result.error ?? legacy('loadFailed')} retryLabel={legacy('retry')} onRetry={() => start(() => router.refresh())} />;
  const counts = segmentCounts(billing.players, today);
  const selected = billing.players.find(player => player.playerId === selectedId);
  const players = billing.players.filter(player => (segment === 'all' || paymentSegment(player, today) === segment)
    && player.fullName.toLocaleLowerCase(locale).includes(search.trim().toLocaleLowerCase(locale)));
  return <section className="space-y-[18px]" aria-busy={pending}>
    <header className="flex flex-wrap items-center justify-between gap-4">
      <div><h1 id="billing-heading" tabIndex={-1} className="font-display text-[30px] font-semibold leading-tight">{legacy('billing')}</h1>
        <p className="mt-1 text-[13px] text-muted">{t('summary', { paid: formatNumber(billing.revenue.thisMonth, locale),
          due: formatNumber(billing.revenue.dues, locale), n: formatNumber(billing.revenue.owing, locale), ending: formatNumber(endingThisWeek(billing.players, today), locale) })}</p></div>
      {billing.players.length > 0 && <Button className="min-h-12 rounded-full" onClick={() => setPicking(true)}>{t('record')}</Button>}
    </header>
    {pending ? <LoadingState variant="cards" /> : billing.players.length === 0 ? <div className="grid items-start gap-4 min-[1001px]:grid-cols-[minmax(0,1fr)_300px]">
      <div className="glass space-y-4 rounded-card border border-line-soft p-5"><p className="text-sm text-faint">{t('empty')}</p><Link href="/captain/players" className="inline-flex min-h-12 items-center rounded-full bg-lime px-5 font-bold text-on-lime">{t('invite')}</Link></div>
      <WorkspacePackages packages={packages} onChange={setPackages} />
    </div> : <>
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div role="group" aria-label={legacy('players')} className="flex max-w-full flex-wrap gap-1 rounded-[28px] border border-line p-1">
          {paymentSegments.map(value => <button key={value} type="button" aria-pressed={segment === value} onClick={() => setSegment(value)}
            className="flex min-h-12 items-center gap-2 rounded-full px-3 text-[13px] text-muted aria-pressed:bg-ink aria-pressed:text-bg-deep">
            {t(value)}<b className={`grid size-[22px] place-items-center rounded-full font-display text-xs ${value === 'overdue' ? 'bg-warn-soft text-warn' : 'bg-surface-raised text-ink'}`}>{formatNumber(counts[value], locale)}</b>
          </button>)}
        </div>
        <label className="flex min-h-12 w-full items-center gap-2 rounded-full border border-line bg-surface px-4 sm:w-[220px]">
          <Search aria-hidden className="size-4 shrink-0 text-faint" /><input aria-label={t('search')} placeholder={t('search')} value={search} onChange={event => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-[13px] outline-none" />
        </label>
      </div>
      <div className="grid items-start gap-4 min-[1001px]:grid-cols-[minmax(0,1fr)_300px]">
        <section className="glass min-w-0 overflow-hidden rounded-card border border-line-soft" aria-label={legacy('players')}>
          <div className="hidden min-h-12 grid-cols-[1.4fr_1fr_1fr_1fr_150px] items-center gap-3 px-[18px] text-[11.5px] text-faint min-[761px]:grid" aria-hidden>
            <span>{t('player')}</span><span>{t('package')}</span><span>{t('last')}</span><span>{t('renewal')}</span><span /></div>
          {players.length ? <ul>{players.map(player => <WorkspaceBillingRow key={`${player.playerId}:${player.accessUntil}:${player.lastPayment?.id}:${player.due}:${player.frozenAt}`} player={player} today={today} packages={packages} />)}</ul>
            : <p className="p-5 text-sm text-faint">{t('noMatches')}</p>}
        </section>
        <WorkspacePackages packages={packages} onChange={setPackages} />
      </div>
      <details className="glass rounded-card border border-line-soft px-5 py-[18px]"><summary className="flex min-h-12 cursor-pointer items-center text-sm text-muted">{t('details')}</summary><FinanceSummary revenue={billing.revenue} /></details>
    </>}
    {picking && <Picker players={billing.players} onClose={() => setPicking(false)} onChoose={player => { setPicking(false); setSelectedId(player.playerId); }} />}
    {selected && <Detail key={`${selected.playerId}:${selected.accessUntil}:${selected.lastPayment?.id}:${selected.due}:${selected.frozenAt}`} player={selected} today={today} packages={packages} initialAction={selected.pending ? 'activate' : selected.due > 0 ? 'collect' : 'renew'} onClose={() => setSelectedId(null)} />}
  </section>;
}

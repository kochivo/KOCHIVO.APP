'use client';
import { use, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { EmptyState, ErrorState, LoadingState } from '@/ui';
import { messages as legacyMessages } from '../messages';
import { messages } from '../workspace/messages';
import type { BillingResult } from '../types';
import { endingThisWeek } from '../workspace';
import { WorkspacePlan } from './workspace-plan';
import { WorkspaceBillingRow } from './workspace-billing-row';
import { FinanceSummary } from './finance-summary';
import { PackagesCard } from './packages-card';
import { PlanCard } from './plan-card';

export function WorkspaceBilling({ data, today }: { data: Promise<BillingResult>; today: string }) {
  const result = use(data), t = useT(messages), legacy = useT(legacyMessages), locale = useLocale(), router = useRouter();
  const [pending, start] = useTransition();
  const [packages, setPackages] = useState(result.data?.packages ?? []);
  const billing = result.data;
  const tiles = billing ? [
    { label: 'paid' as const, value: formatNumber(billing.revenue.thisMonth, locale), unit: t('currency'), warn: false },
    { label: 'dues' as const, value: formatNumber(billing.revenue.dues, locale), unit: t('currency'), warn: true },
    { label: 'endingWeek' as const, value: formatNumber(endingThisWeek(billing.players, today), locale), unit: t('playerUnit'), warn: false },
  ] : [];
  return <section className="space-y-[18px]">
    <h1 id="billing-heading" tabIndex={-1} className="font-display text-[30px] font-semibold leading-tight">{legacy('billing')}</h1>
    {pending ? <LoadingState variant="cards" /> : !billing ? <ErrorState message={result.error ?? legacy('loadFailed')} retryLabel={t('retry')} onRetry={() => start(() => router.refresh())} /> : <>
      <div className="grid items-stretch gap-3.5 min-[1001px]:grid-cols-[1fr_1.6fr]">
        <WorkspacePlan data={billing} /><div className="grid gap-3 min-[1001px]:grid-cols-3">{tiles.map(tile =>
          <div key={tile.label} className="glass-strong rounded-card border border-line-soft px-4 py-3.5"><p className="text-xs text-faint">{t(tile.label)}</p>
            <p className={`my-1.5 font-display text-[22px] font-extrabold tabular-nums ${tile.warn ? 'text-warn' : ''}`}>{tile.value} <small className="font-sans text-xs font-medium text-faint">{tile.unit}</small></p></div>)}</div>
      </div>
      <section className="glass overflow-hidden rounded-card border border-line-soft" aria-label={legacy('players')}>
        <div className="hidden min-h-12 grid-cols-[1.4fr_1fr_1fr_1fr_150px] items-center gap-3 px-4 text-xs text-faint min-[1001px]:grid" aria-hidden>
          <span>{t('player')}</span><span>{t('status')}</span><span>{t('until')}</span><span>{t('last')}</span><span /></div>
        {billing.players.length === 0 ? <EmptyState icon={Users} title={legacy('noPlayers')} body={legacy('playersHint')} action={{ label: legacy('invitePlayer'), href: '/captain/players' }} />
          : <ul>{billing.players.map(player => <WorkspaceBillingRow key={`${player.playerId}:${player.accessUntil}:${player.lastPayment?.id}:${player.due}:${player.frozenAt}`} player={player} today={today} packages={packages} />)}</ul>}
      </section>
      <details className="glass rounded-card border border-line-soft px-5 py-[18px]"><summary className="flex min-h-12 cursor-pointer items-center text-sm text-muted">{t('details')}</summary>
        <div className="space-y-4"><FinanceSummary revenue={billing.revenue} /><PackagesCard packages={packages} onChange={setPackages} /><PlanCard plan={billing.plan} used={billing.used} subscriptionEnd={billing.subscriptionEnd} /></div>
      </details>
    </>}
  </section>;
}

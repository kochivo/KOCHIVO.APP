'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { use, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/ui';
import type { BillingResult } from '../types';
import { FinanceSummary } from './finance-summary';
import { PackagesCard } from './packages-card';
import { PlanCard } from './plan-card';
import { PlayerBillingRow } from './player-billing-row';

export function BillingScreen({ data, today }: { data: Promise<BillingResult>; today: string }) {
  const t = useT(messages);
  const result = use(data);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const [packages, setPackages] = useState(result.data?.packages ?? []);
  return (
    <section className="space-y-6">
      <header><h1 className="text-3xl font-extrabold">{t('billing')}</h1><p className="mt-2 text-sm text-muted">{t('intro')}</p></header>
      {pending ? <LoadingState variant="cards" /> : result.error || !result.data ? <ErrorState message={result.error ?? t('loadFailed')} retryLabel={t('retry')} onRetry={() => startTransition(() => router.refresh())} />
        : <><FinanceSummary revenue={result.data.revenue} /><div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="space-y-4" aria-labelledby="billing-players">
            <h2 id="billing-players" className="text-xl font-bold">{t('players')}</h2>
            {result.data.players.length === 0 ? <EmptyState icon={Users} title={t('noPlayers')} body={t('playersHint')} />
              : <ul className="space-y-3">{result.data.players.map((player) => <PlayerBillingRow key={`${player.playerId}:${player.accessUntil}:${player.lastPayment?.id ?? ''}:${player.due}`} player={player} today={today} packages={packages} />)}</ul>}
          </section>
          <div className="order-first space-y-6 xl:order-none">
            <PackagesCard packages={result.data.packages} onChange={setPackages} />
            <PlanCard plan={result.data.plan} used={result.data.used} subscriptionEnd={result.data.subscriptionEnd} />
          </div>
        </div></>}
    </section>
  );
}

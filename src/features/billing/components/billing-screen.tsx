'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { use, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/ui';
import type { BillingResult } from '../types';
import { PlanCard } from './plan-card';
import { PlayerBillingRow } from './player-billing-row';

export function BillingScreen({ data, today }: { data: Promise<BillingResult>; today: string }) {
  const t = useT(messages);
  const result = use(data);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <section className="space-y-6">
      <header><h1 className="text-3xl font-extrabold">{t('billing')}</h1><p className="mt-2 text-sm text-muted">{t('intro')}</p></header>
      {pending ? <LoadingState /> : result.error || !result.data ? <ErrorState message={result.error ?? t('loadFailed')} retryLabel={t('retry')} onRetry={() => startTransition(() => router.refresh())} />
        : <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="space-y-4" aria-labelledby="billing-players">
            <h2 id="billing-players" className="text-xl font-bold">{t('players')}</h2>
            {result.data.players.length === 0 ? <EmptyState icon={Users} title={t('noPlayers')} body={t('playersHint')} />
              : <ul className="space-y-3">{result.data.players.map((player) => <PlayerBillingRow key={`${player.playerId}:${player.accessUntil}:${player.lastPayment?.id ?? ''}`} player={player} today={today} />)}</ul>}
          </section>
          <PlanCard plan={result.data.plan} used={result.data.used} subscriptionEnd={result.data.subscriptionEnd} />
        </div>}
    </section>
  );
}

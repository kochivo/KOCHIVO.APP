'use client';

import { use, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Users } from 'lucide-react';
import { EmptyState, ErrorState, LoadingState } from '@/ui';
import type { BillingResult } from '../types';
import { PlanCard } from './plan-card';
import { PlayerBillingRow } from './player-billing-row';

export function BillingScreen({ data, today }: { data: Promise<BillingResult>; today: string }) {
  const result = use(data);
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  return (
    <section className="space-y-6">
      <header><h1 className="text-3xl font-extrabold">الاشتراكات</h1><p className="mt-2 text-sm text-muted">جدّد للاعبينك وتابع باقتك</p></header>
      {pending ? <LoadingState /> : result.error || !result.data ? <ErrorState message={result.error ?? 'مش قادرين نحمّل الاشتراكات. جرّب تاني'} retryLabel="جرّب تاني" onRetry={() => startTransition(() => router.refresh())} />
        : <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <section className="space-y-4" aria-labelledby="billing-players">
            <h2 id="billing-players" className="text-xl font-bold">لاعبيني</h2>
            {result.data.players.length === 0 ? <EmptyState icon={Users} title="لسه مفيش لاعبين. ابعت دعوة من صفحة اللاعبين" body="اللاعبين هيظهروا هنا أول ما يقبلوا الدعوة" />
              : <ul className="space-y-3">{result.data.players.map((player) => <PlayerBillingRow key={`${player.playerId}:${player.accessUntil}:${player.lastPayment?.id ?? ''}`} player={player} today={today} />)}</ul>}
          </section>
          <PlanCard plan={result.data.plan} used={result.data.used} subscriptionEnd={result.data.subscriptionEnd} />
        </div>}
    </section>
  );
}

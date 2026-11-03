'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Utensils } from 'lucide-react';
import { Button, EmptyState } from '@/ui';
import { LoadingState } from '@/ui/loading-state';
import { createPlan, listPlayerPlans } from '../data/plan-io';
import type { PlanSummary } from '../types';
import { starterText } from '@/lib/starter-text';

export function PlayerPlans({ playerId }: { playerId: string }) {
  const t = useT(messages);
  const locale = useLocale();
  const statuses: Record<string, string> = { active: t('active'), draft: t('draft'), archived: t('archived') };
  const router = useRouter();
  const [plans, setPlans] = useState<PlanSummary[] | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [title, setTitle] = useState(t('newPlan'));
  useEffect(() => {
    let current = true;
    listPlayerPlans(playerId).then(value => { if (current) { setPlans(value); setError(''); } })
      .catch(() => { if (current) setError(t('couldntLoadPlansTryAgain')); });
    return () => { current = false; };
  }, [playerId, retry, t]);
  async function create() {
    setBusy(true); setError('');
    try { router.push(`/captain/nutrition/${await createPlan(playerId, title)}`); }
    catch { setError(t('couldntCreateThePlanTryAgain')); setBusy(false); }
  }
  return <div className="mx-auto grid max-w-5xl gap-5">
    <h1 className="text-3xl font-bold">{t('mealPlans')}</h1>
    <div className="glass grid gap-3 rounded-card p-5 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-end">
      <label className="grid min-w-0 gap-2 text-sm font-semibold">{t('planName')}<input value={title} maxLength={80} onChange={event => setTitle(event.target.value)} className="min-h-12 rounded-control bg-surface px-3 text-base font-normal" /></label>
      <Button variant="secondary" disabled={busy || !title.trim()} onClick={() => void create()}>{t('newPlan')}</Button>
    </div>
    {busy && <p role="status">{t('creatingPlan')}</p>}
    {error && <div role="alert">{error}<Button variant="secondary" onClick={() => setRetry(n => n + 1)}>{t('tryAgain')}</Button></div>}
    {!plans && !error && <LoadingState variant="cards" />}
    {plans?.length === 0 && <EmptyState icon={Utensils} title={t('noPlansYetCreateANewOne')} body={t('emptyBody')} action={{ label: t('orStartFromTemplate'), href: '/captain/templates' }} />}
    <ul className="grid gap-3 lg:grid-cols-2">{plans?.map(plan => <li key={plan.id}><Link href={`/captain/nutrition/${plan.id}`} className="glass flex min-h-12 items-center justify-between gap-3 rounded-control p-4">
      <span>{starterText(plan.title, locale)}</span><span className="text-muted">{statuses[plan.status]}</span>
    </Link></li>)}</ul>
  </div>;
}

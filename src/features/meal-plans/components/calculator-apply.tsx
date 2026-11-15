'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useLocale, useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import type { Macros } from '@/lib/macros';
import { formatNumber } from '@/lib/format';
import { loadPlan, savePlan } from '../data/plan-io';
import type { PlanSummary } from '../types';
import { messages } from './calculator/messages';
import { buttonClass } from '@/ui/button';

export async function applyCalculatorTargets(planId: string, playerId: string, targets: Macros) {
  const loaded = await loadPlan(planId);
  if (!loaded.ok) return loaded;
  if (loaded.data.playerId !== playerId || loaded.data.status === 'archived') return { ok: false as const };
  return savePlan({ ...loaded.data, targets });
}

export function CalculatorApply({ playerId, plans, targets }: { playerId: string; plans: PlanSummary[]; targets: Macros | null }) {
  const t = useT(messages);
  const locale = useLocale();
  const [planId, setPlanId] = useState(plans.find(plan => plan.status === 'active')?.id ?? plans[0]?.id ?? '');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [applied, setApplied] = useState<{ planId: string; targets: Macros } | null>(null);
  async function apply() {
    if (!targets || !planId || busy) return;
    const previous = applied;
    setApplied({ planId, targets }); setBusy(true); setError(false);
    try {
      const result = await applyCalculatorTargets(planId, playerId, targets);
      if (!result.ok) { setApplied(previous); setError(true); }
    } catch { setApplied(previous); setError(true); }
    finally { setBusy(false); }
  }
  if (!plans.length) return <Link className={buttonClass({ variant: 'secondary', block: false, className: "flex min-h-12 items-center p-4" })} href={`/captain/players/${playerId}/nutrition`}>{t('noPlans')}</Link>;
  return <section className="grid gap-3">
    <label className="grid gap-2">{t('choosePlan')}<select value={planId} disabled={busy}
      onChange={event => { setPlanId(event.target.value); setError(false); }} className="min-h-12 rounded-control bg-surface px-3">
      {plans.map(plan => <option key={plan.id} value={plan.id}>{plan.title}</option>)}
    </select></label>
    <p className="text-sm text-muted">{t('averageOnly')}</p>
    <Button disabled={!targets || busy} onClick={() => void apply()}>{t('apply')}</Button>
    {applied?.planId === planId && <p role="status">{t(busy ? 'applying' : 'saved')} · {t('kcal', { value: formatNumber(applied.targets.kcal, locale) })}</p>}
    {error && <p role="alert" className="text-danger">{t('failed')}</p>}
  </section>;
}

'use client';

import { AlertTriangle } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { balance, groups } from '../analytics/balance';
import type { MuscleVolume } from '../analytics/muscle-map';
import { messages } from '../analytics/premium/messages';

export function BalanceBar({ volume }: { volume: MuscleVolume }) {
  const t = useT(messages);
  const values = balance(volume);
  const colors = { push: 'bg-lime', pull: 'bg-lime/60', legs: 'bg-lime/30' };
  return <div className="glass space-y-3 rounded-card p-4">
    <div className="flex justify-between text-sm font-bold">
      {groups.map(group => <span key={group}>{t(group)} <span className="text-ink">{t('percent', { value: values[group] })}</span></span>)}
    </div>
    <div className="flex h-3 overflow-hidden rounded-full bg-line shadow-lime-glow">
      {groups.map(group => <span key={group} role="img" aria-label={t('balanceSegment', { group: t(group), value: values[group] })}
        data-segment={group} className={`h-full ${colors[group]} transition-all duration-150 motion-reduce:transition-none`}
        style={{ width: `${values[group]}%` }} />)}
    </div>
    {values.core > 0 && <p className="text-sm text-muted">{t('regionSets', { muscle: t('muscle.core'), sets: values.core })}</p>}
    {values.under.length > 0 && <p className="glass flex items-center gap-2 rounded-control p-3 text-sm text-muted">
      <AlertTriangle aria-hidden className="size-4 shrink-0 text-lime" />{t('undertrained', { groups: values.under.map(group => t(group)).join(t('separator')) })}
    </p>}
  </div>;
}

import { useT } from '@/core/i18n/client';
import Link from 'next/link';
import { Button, buttonClass } from '@/ui/button';
import { guidedMessages } from './messages';
import { planIndex, summary } from './state';
import type { DemoState } from './state';
import type { DemoPlan } from './types';

export function Summary({ state, plans, now, onExplore, onAccount }: { state: DemoState; plans: readonly DemoPlan[]; now: number; onExplore: () => void; onAccount: () => void }) {
  const t = useT(guidedMessages), values = summary(state, now), index = planIndex(state.n);
  const plan = plans[index];
  if (!plan) return null;
  const name = plan.name;
  return <div className="grid gap-stack">
    {values.actions === 0 && <p className="rounded-control border border-lime/30 bg-lime-soft p-stack text-xs">{t('noActions')}</p>}
    <div className={`grid ${values.actions === 0 ? 'grid-cols-2' : 'grid-cols-3'} gap-inline`}>
      {[...(values.actions === 0 ? [] : [[values.actions, t('actions')]]), [values.elapsed, t('time')], [values.players, t('summaryPlayers', { n: values.players })]].map(([value, label]) =>
        <div key={label} className="glass-strong rounded-control p-stack text-center">
          <b className="block text-title tabular-nums" dir="ltr">{value}</b><span className="text-micro text-muted">{label}</span>
        </div>)}
    </div>
    <div className="recessed flex items-center justify-between gap-inline rounded-control p-stack">
      <div><p className="text-xs text-muted">{t('recommended')}</p><b>{name}</b></div>
      <div className="text-end text-sm"><p>{index === 0 ? t('freePrice') : t('price', { price: plan.price.toLocaleString('en-US') })}</p><small className="text-muted">{t('limit', { n: plan.limit })}</small></div>
    </div>
    <div className="demo-guide-actions grid grid-cols-2 gap-inline"><Button block variant="secondary" onClick={onExplore}>{t('explore')}</Button>
      <Link prefetch={false} className={buttonClass({ block: true })} href="/#pricing">{index === 0 ? t('free') : t('startPlan', { plan: name })}</Link></div>
    <Button variant="secondary" onClick={onAccount}>{t('account')}</Button>
  </div>;
}

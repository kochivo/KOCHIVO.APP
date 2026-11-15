import { useT } from '@/core/i18n/client';
import { GlassCard } from '@/ui/glass-card';
import { Button } from '@/ui/button';
import { ProgressBar } from '@/ui/progress-bar';
import { guidedMessages } from './messages';
import { DemoRow } from './demo-row';
import type { PaneProps } from './types';

export function Money({ state, act }: PaneProps) {
  const t = useT(guidedMessages), collected = 21400 + (state.paid ? 1000 : 0) + (state.renewed ? 2100 : 0), owed = state.paid ? 500 : 1500;
  return <div className="grid gap-card-gap min-[1200px]:grid-cols-2"><GlassCard level="strong" className="grid content-start gap-stack p-card"><h3>{t('collected')}</h3><p className="text-stat-large font-bold tabular-nums">{collected.toLocaleString('en-US')}<small className="ms-2 text-sm text-muted">{t('currency')}</small></p>
    <ProgressBar value={collected} max={collected + owed} aria-label={t('collected')} /><p className="text-sm text-warn">{t('owed')} · {owed}</p>
    {(['cash', 'transfer', 'payments'] as const).map((key, i) => <DemoRow key={key} title={t(key)} detail={String([9200, collected - 9200, 17 + Number(state.paid) + Number(state.renewed)][i])} />)}
  </GlassCard><GlassCard className="grid content-start gap-stack p-card" data-demo-target="owed"><h3>{t('whoOwes')}</h3><DemoRow title={t('names').split('|')[0]} detail={t(state.paid ? 'paid' : 'remaining')}>
    {!state.paid && <Button onClick={() => act('pay')}>{t('pay')}</Button>}</DemoRow><DemoRow title={t('names').split('|')[7]} detail={String(500)}><Button variant="secondary" onClick={() => act('remind')}>{t('nudge')}</Button></DemoRow>
    <h3>{t('package')}</h3>{t('packages').split('|').map((title, i) => <DemoRow key={title} title={title} detail={t('packageDetails').split('|')[i]} />)}
  </GlassCard></div>;
}

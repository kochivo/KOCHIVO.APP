import { useLocale, useT } from '@/core/i18n/client';
/* eslint-disable no-restricted-imports -- T-288 shares the real billing presentation without loading account data. */
import { WorkspaceBillingTiles } from '@/features/billing/components/workspace-billing-tiles';
import { MoneyOwedView } from '@/features/captain-workspace/money-owed/money-owed-view';
import { messages as moneyMessages } from '@/features/captain-workspace/money-owed/messages';
/* eslint-enable no-restricted-imports */
import { GlassCard } from '@/ui/glass-card';
import { Button } from '@/ui/button';
import { ProgressBar } from '@/ui/progress-bar';
import { guidedMessages } from './messages';
import { DemoRow } from './demo-row';
import type { PaneProps } from './types';
import { demoMoney } from './money-data';

export function Money({ state, act, dispatch, now }: PaneProps) {
  const t = useT(guidedMessages), collected = 21400 + (state.paid ? 1000 : 0) + (state.renewed ? 2100 : 0), owed = state.paid ? 500 : 1500;
  const locale = useLocale(), money = useT(moneyMessages);
  return <><WorkspaceBillingTiles values={{ income: collected, pending: owed, ending: state.renewed ? 1 : 2, active: state.n }} />
    <div data-demo-target="owed"><MoneyOwedView data={demoMoney(state, t('names').split('|'))} mode="billing" locale={locale} t={money}
      rowAction={id => id === 'mohamed' ? <Button block={false} onClick={() => act('pay')}>{t('pay')}</Button>
        : <Button block={false} variant="secondary" onClick={() => act('remind')}>{t('nudge')}</Button>}
      onSelect={href => dispatch({ type: 'go', page: href.includes('players') ? 'player' : 'money', now: now() })} /></div>
    <div className="grid gap-card-gap min-[1200px]:grid-cols-2"><GlassCard level="strong" className="grid content-start gap-stack p-card"><h3>{t('collected')}</h3><p className="text-stat-large font-bold tabular-nums">{collected.toLocaleString('en-US')}<small className="ms-inline text-sm text-muted">{t('currency')}</small></p>
    <ProgressBar value={collected} max={collected + owed} aria-label={t('collected')} /><p className="text-sm text-warn">{t('owed')} · {owed}</p>
    {(['cash', 'transfer', 'payments'] as const).map((key, i) => <DemoRow key={key} title={t(key)} detail={String([9200, collected - 9200, 17 + Number(state.paid) + Number(state.renewed)][i])} />)}
  </GlassCard><GlassCard className="grid content-start gap-stack p-card">
    <h3>{t('package')}</h3>{t('packages').split('|').map((title, i) => <DemoRow key={title} title={title} detail={t('packageDetails').split('|')[i]} />)}
  </GlassCard></div></>;
}

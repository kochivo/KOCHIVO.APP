import { useT } from '@/core/i18n/client';
import { GlassCard } from '@/ui/glass-card';
import { Button } from '@/ui/button';
import { guidedMessages } from './messages';
import { DemoRow } from './demo-row';
import { WeightChart } from './weight-chart';
import type { PaneProps } from './types';

export function PlayerFile({ state, dispatch, now }: PaneProps) {
  const t = useT(guidedMessages);
  return <><GlassCard className="flex flex-wrap items-center gap-inline p-card"><h3 className="flex-1 text-title">{t('names').split('|')[0]}</h3><Button variant="secondary" onClick={() => dispatch({ type: 'go', page: 'inbox', now: now() })}>{t('message')}</Button></GlassCard>
    <nav className="flex flex-wrap gap-inline">{(['programs', 'food', 'assess', 'money'] as const).map(page => <Button key={page} variant="secondary" onClick={() => dispatch({ type: 'go', page, now: now() })}>{t(page)}</Button>)}</nav>
    <div className="grid grid-cols-3 gap-inline">{[['commitment', '92%'], ['weight', '80.6'], ['bench', Math.max(65, ...state.sets.map(s => s[0]))]].map(([key, value]) => <div className="glass-strong rounded-control p-stack" key={key}><p className="text-xs text-muted">{t(key as 'weight')}</p><b className="text-h tabular-nums">{value}</b></div>)}</div>
    <WeightChart /><GlassCard className="grid gap-stack p-card"><h3>{t('lastSets')}</h3>{state.sets.slice().reverse().map((s, i) => <DemoRow key={i} title={`${s[0]} ${t('kg')} × ${s[1]}`} />)}</GlassCard>
  </>;
}

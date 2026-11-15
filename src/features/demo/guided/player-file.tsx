import { useLocale, useT } from '@/core/i18n/client';
/* eslint-disable no-restricted-imports -- T-288 reuses safe player overview leaves; the routed header stays isolated. */
import { TrainingAdherence } from '@/features/captain-workspace/player-file/training-adherence';
import { Measurements } from '@/features/captain-workspace/player-file/measurements';
/* eslint-enable no-restricted-imports */
import { GlassCard } from '@/ui/glass-card';
import { Button } from '@/ui/button';
import { guidedMessages } from './messages';
import { DemoRow } from './demo-row';
import { WeightChart } from './weight-chart';
import type { PaneProps } from './types';

export function PlayerFile({ state, dispatch, now }: PaneProps) {
  const t = useT(guidedMessages), locale = useLocale();
  return <><GlassCard className="flex flex-wrap items-center gap-inline p-card"><h3 className="flex-1 text-title">{t('names').split('|')[0]}</h3><Button variant="secondary" onClick={() => dispatch({ type: 'go', page: 'inbox', now: now() })}>{t('message')}</Button></GlassCard>
    <nav className="flex flex-wrap gap-inline">{(['programs', 'food', 'assess', 'money'] as const).map(page => <Button key={page} variant="secondary" onClick={() => dispatch({ type: 'go', page, now: now() })}>{t(page)}</Button>)}</nav>
    <div className="grid gap-stack min-[760px]:grid-cols-3"><TrainingAdherence completed={11} planned={12} rpe={null} locale={locale} />
      <Measurements metrics={[{ key: 'weight', value: 80.6, change: -3.4 }]} locale={locale} />
      <div className="glass-strong rounded-control p-stack"><p className="text-xs text-muted">{t('bench')}</p><b className="text-h tabular-nums">{Math.max(65, ...state.sets.map(s => s[0]))}</b></div>
    </div>
    <WeightChart /><GlassCard className="grid gap-stack p-card"><h3>{t('lastSets')}</h3>{state.sets.slice().reverse().map((s, i) => <DemoRow key={i} title={`${s[0]} ${t('kg')} × ${s[1]}`} />)}</GlassCard>
  </>;
}

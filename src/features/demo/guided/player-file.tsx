import { useLocale, useT } from '@/core/i18n/client';
/* eslint-disable no-restricted-imports -- T-288 reuses safe player overview leaves; the routed header stays isolated. */
import { TrainingAdherence } from '@/features/captain-workspace/player-file/training-adherence';
import { Measurements } from '@/features/captain-workspace/player-file/measurements';
/* eslint-enable no-restricted-imports */
import { StatStrip } from '@/ui/stat-strip';
// eslint-disable-next-line no-restricted-imports -- Shared player file labels only.
import { messages as fileMessages } from '@/features/captain-workspace/player-file/messages';
import { GlassCard } from '@/ui/glass-card';
import { Button } from '@/ui/button';
import { guidedMessages } from './messages';
import { DemoRow } from './demo-row';
import { WeightChart } from './weight-chart';
import type { PaneProps } from './types';

export function PlayerFile({ state, dispatch, now }: PaneProps) {
  const t = useT(guidedMessages), ft = useT(fileMessages), locale = useLocale();
  const go = (page: 'programs' | 'food' | 'assess' | 'money' | 'inbox') => dispatch({ type: 'go', page, now: now() });
  return <><GlassCard className="grid items-center gap-card-gap min-[1200px]:grid-cols-2"><div className="flex items-center gap-stack"><span aria-hidden className="glass-strong grid size-16 shrink-0 place-items-center rounded-full border-2 border-lime text-title font-bold">{t('names')[0]}</span><div><h3 className="text-title font-bold">{t('names').split('|')[0]}</h3><p className="text-xs text-muted">{t('programTitle')}</p><Button variant="secondary" block={false} onClick={() => go('inbox')}>{ft('chat')}</Button></div></div><StatStrip items={[
    { label: ft('weight'), value: 80.6, unit: t('kg'), tone: 'lime' }, { label: ft('adherence'), value: '92%' },
    { label: ft('training'), value: 11 }, { label: ft('subscription'), value: 30, unit: ft('dayUnit'), tone: 'warn' },
  ]} /></GlassCard>
    <nav className="flex max-w-full gap-inline overflow-x-auto border-b border-line-soft" aria-label={ft('tabs')}><button type="button" aria-current="page" className="min-h-12 shrink-0 border-b-2 border-lime px-card text-sm font-bold">{ft('overview')}</button>{([
      ['programs', 'training'], ['food', 'nutrition'], ['assess', 'checkins'], ['assess', 'assessments'], ['inbox', 'chat'],
    ] as const).map(([page, key]) => <button type="button" key={key} className="min-h-12 shrink-0 px-card text-sm text-muted" onClick={() => go(page)}>{ft(key)}</button>)}</nav>
    <div className="grid gap-stack min-[760px]:grid-cols-3"><TrainingAdherence completed={11} planned={12} rpe={null} locale={locale} />
      <Measurements metrics={[{ key: 'weight', value: 80.6, change: -3.4 }]} locale={locale} />
      <div className="glass-strong rounded-control p-stack"><p className="text-xs text-muted">{t('bench')}</p><b className="text-h tabular-nums">{Math.max(65, ...state.sets.map(s => s[0]))}</b></div>
    </div>
    <WeightChart /><GlassCard className="grid gap-stack p-card"><h3>{t('lastSets')}</h3>{state.sets.slice().reverse().map((s, i) => <DemoRow key={i} title={`${s[0]} ${t('kg')} × ${s[1]}`} />)}</GlassCard>
  </>;
}

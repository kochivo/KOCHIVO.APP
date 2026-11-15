import { useT } from '@/core/i18n/client';
import { GlassCard } from '@/ui/glass-card';
import { guidedMessages } from './messages';
import { WeightChart } from './weight-chart';
import { DemoRow } from './demo-row';
import type { PaneProps } from './types';
export function PhoneMe({ state }: PaneProps) {
  const t = useT(guidedMessages);
  return <><h3 className="text-title">{t('progress')}</h3><WeightChart />
    <GlassCard className="grid gap-stack p-card"><h4>{t('records')}</h4>{t('recordNames').split('|').map((name, i) => <DemoRow key={name} title={name} detail={`${[Math.max(65, ...state.sets.map(s => s[0])), 100, 120][i]} ${t('kg')}`} />)}</GlassCard>
    <GlassCard className="grid gap-stack p-card"><h4>{t('subscription')}</h4><DemoRow title={t('packages').split('|')[1]} detail={t(state.paid ? 'paid' : 'remaining')} /></GlassCard>
  </>;
}

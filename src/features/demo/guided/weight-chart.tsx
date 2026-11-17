import { useT } from '@/core/i18n/client';
import { GlassCard } from '@/ui/glass-card';
import { guidedMessages } from './messages';
export function WeightChart() {
  const t = useT(guidedMessages);
  return <GlassCard data-demo-target="chart" className="p-card"><h3 className="flex flex-wrap items-baseline gap-inline text-md font-semibold"><span>{t('chart')}</span><bdi dir="ltr" className="whitespace-nowrap text-lime">−3.4 {t('kg')}</bdi></h3>
    <svg viewBox="0 0 530 160" role="img" aria-label={t('chart')} className="w-full text-lime">
      {[30, 75, 120].map(y => <line key={y} x1="20" x2="510" y1={y} y2={y} className="stroke-line" />)}
      <polygon points="20,150 20,20 90,34 160,51 230,65 300,82 370,102 440,119 510,136 510,150" className="fill-lime-soft" />
      <polyline points="20,20 90,34 160,51 230,65 300,82 370,102 440,119 510,136" fill="none" stroke="currentColor" strokeWidth="3" />
    </svg>
  </GlassCard>;
}

'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { useRamadan } from '@/lib/use-ramadan';
import { formatNumber } from '@/lib/format';
import { ramadanTarget } from '../ramadan-intensity';
import { messages } from '../ramadan/messages';
export function RamadanWorkoutHint({ weight, sets }: { weight: number | null; sets: number }) {
  const resource = useRamadan(), t = useT(messages), locale = useLocale();
  const status = resource.data;
  if (!status?.active || status.intensity === 'same') return null;
  const target = ramadanTarget({ weight, sets }, status.intensity);
  return <div className="flex flex-wrap items-center gap-inline text-xs text-muted">
    <span className="rounded-full border border-line-soft bg-surface-raised px-stack py-inline">{t(status.intensity === 'lighter_20' ? 'lighter' : 'maintenance')}</span>
    <bdi>{status.intensity === 'maintenance' ? t('sets', { n: formatNumber(target.sets, locale) })
      : target.weight !== null ? t('weight', { n: formatNumber(target.weight, locale) }) : null}</bdi>
  </div>;
}

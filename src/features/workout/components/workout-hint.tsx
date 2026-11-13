'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { detectPr } from '../pr';
import type { Performance } from '../data/last-performance';
import { messages } from '../messages';

export function WorkoutHint({ last, history, weight, reps }: {
  last: Performance | null; history: readonly Performance[]; weight: number; reps: number;
}) {
  const locale = useLocale();
  const t = useT(messages);
  const record = detectPr(history, { weight_kg: weight, reps });
  if (!last && !record) return null;
  return <div className="flex flex-wrap items-center justify-center gap-2 text-xs text-muted">
    {last && <>{t('v3Previous')} <bdi dir="ltr" className="font-display font-bold text-ink">
      {formatNumber(last.weight_kg ?? 0, locale)} × {formatNumber(last.reps ?? 0, locale)}</bdi></>}
    {record && <span className="font-bold text-gold-2">{t('v3PrHint')}</span>}
  </div>;
}

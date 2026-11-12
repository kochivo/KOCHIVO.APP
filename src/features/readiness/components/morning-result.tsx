'use client';

import { Zap } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import type { DailyCheckRow } from '@/core/offline/tables';
import { readinessScore, suggestDecision } from '../score';
import { messages } from '../v6-messages';

export function MorningResult({ row, goal = 3000 }: { row: DailyCheckRow | null; goal?: number }) {
  const t = useT(messages);
  if (row?.sleep_hours == null || row.soreness == null) return null;
  const result = readinessScore({ sleepHours: row.sleep_hours, soreness: row.soreness,
    waterMl: row.water_ml, waterGoalMl: goal });
  if (!result) return null;
  return <div role="status" className="glass-strong flex items-center gap-3 rounded-card border border-line-soft p-5">
    <Zap aria-hidden className="size-6 shrink-0 text-lime" />
    <div><p>{t('score', { n: result.score })}</p>
      <p className="mt-1 text-xs text-faint">{t('suggested', { decision: t(suggestDecision(result.score)) })}</p></div>
  </div>;
}

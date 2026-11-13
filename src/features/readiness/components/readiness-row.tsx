'use client';
import { Button } from '@/ui/button';

import dynamic from 'next/dynamic';
import { useState } from 'react';
import { HeartPulse } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import type { DailyCheckRow } from '@/core/offline/tables';
import { readinessScore } from '../score';
import { messages } from '../messages';

const QuestionsSheet = dynamic(() => import('./questions-sheet').then(module => module.QuestionsSheet), { ssr: false });

export function ReadinessRow({ row, goal, onChange }: {
  row: DailyCheckRow | null; goal: number;
  onChange: (patch: Partial<Pick<DailyCheckRow, 'sleep_hours' | 'soreness'>>) => void;
}) {
  const t = useT(messages);
  const [open, setOpen] = useState(false);
  const score = readinessScore({ sleepHours: row?.sleep_hours, soreness: row?.soreness, waterMl: row?.water_ml, waterGoalMl: goal });
  return <>
    <div className="glass flex items-center gap-3 rounded-card px-4 py-2">
      <HeartPulse aria-hidden className="size-5 text-muted" />
      <p className="flex-1 text-sm">{row?.sleep_hours != null && row.soreness != null ? t('readiness', { n: score?.score ?? 0 }) : t('unanswered')}</p>
      <Button variant="secondary" id="readiness-edit" type="button" onClick={() => setOpen(true)} className="min-h-12 px-3 font-bold text-muted">{t('edit')}</Button>
    </div>
    {open && <QuestionsSheet row={row} goal={goal} onChange={onChange} onClose={() => setOpen(false)} />}
  </>;
}

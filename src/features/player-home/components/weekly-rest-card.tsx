'use client';

import { Moon } from 'lucide-react';
import type { ProgramSnapshot } from '@/core/offline';
import { useLocale, useT } from '@/core/i18n/client';
import { starterText } from '@/lib/starter-text';
import { messages } from '../messages';
import { nextTrainingDay, weeklyFinished } from '../next-day';

const weekdays = ['sat', 'sun', 'mon', 'tue', 'wed', 'thu', 'fri'] as const;

export function WeeklyRestCard({ snapshot, today }: { snapshot: ProgramSnapshot; today: string }) {
  const t = useT(messages);
  const locale = useLocale();
  const finished = weeklyFinished(snapshot, today);
  const next = finished ? undefined : nextTrainingDay(snapshot, today);
  return <section className="glass space-y-3 rounded-card border border-dashed border-line p-5">
    <Moon aria-hidden className="size-6 text-muted" />
    <h2 className="text-xl font-bold">{t(finished ? 'programFinished' : 'weeklyRest')}</h2>
    {finished && <p className="text-muted">{t('renewProgram')}</p>}
    {next && next.weekday != null && <p className="text-muted">{t('nextTraining', {
      name: starterText(next.title, locale) || t(weekdays[next.weekday] ?? 'sat'),
      weekday: t(weekdays[next.weekday] ?? 'sat'),
    })}</p>}
  </section>;
}

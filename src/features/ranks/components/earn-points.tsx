'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { localDate } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { Button, buttonClass } from '@/ui/button';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import type { MyPoints } from '../data/points-schema';
import { messages } from '../messages';
import { useWorkoutLink } from '../hooks/use-workout-link';

const sources = [['workout',3], ['pr',1], ['perfect_week',10], ['inbody',5], ['meal_check',1]] as const;

export function EarnPoints({ logs, today: suppliedToday, expanded = false }: {
  logs: MyPoints['logs']; today?: string; expanded?: boolean;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const timezone = useTimezone();
  const today = suppliedToday ?? localDate(new Date(), timezone);
  const [open, setOpen] = useState(expanded);
  const href = useWorkoutLink(today, open);
  return <>
    <Button id="earn-points" variant="secondary" block onClick={() => setOpen(true)}>{t('howPoints')}</Button>
    {open && <ResponsiveDialog modal title={t('earnTitle')} fallbackId="earn-points" onDismiss={() => setOpen(false)}
      className="sheet fixed start-0 end-0 top-auto bottom-0 m-0 max-h-[85dvh] w-full max-w-lg overflow-y-auto rounded-t-card border border-line p-card text-ink backdrop:bg-bg-deep/80 min-[760px]:inset-0 min-[760px]:m-auto min-[760px]:rounded-card"
      footer={<Link href={href ?? '/player'} className={buttonClass({ block: true })}>{t('startToday')}</Link>}>
      <div className="space-y-stack">{sources.map(([kind, points]) => {
        const earned = logs.some(log => log.kind === kind && log.status === 'counted' && log.earned_on === today);
        return <div key={kind} data-earned={earned} className="flex min-h-12 items-center gap-stack rounded-control border border-line bg-bg-deep p-stack">
          <span className={`grid size-6 place-items-center rounded-full border ${earned ? 'border-lime bg-lime text-on-lime' : 'border-line'}`}>
            {earned && <Check aria-hidden className="size-4" />}</span>
          <span className="flex-1">{t(kind)}</span><b className="text-lime">+{formatNumber(points, locale)}</b>
        </div>;
      })}<p className="text-sm text-muted">{t('fastest')}</p></div>
    </ResponsiveDialog>}
  </>;
}

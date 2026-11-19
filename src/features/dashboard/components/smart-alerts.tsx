'use client';
import { formatNumber } from '@/lib/format';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useState } from 'react';
import Link from 'next/link';
import { BellRing, CalendarClock, CheckCheck, ClipboardList, Dumbbell, Wallet } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Button, EmptyState, GlassCard } from '@/ui';
import type { AlertKind, SmartAlert } from '../alerts';

const styles: Record<AlertKind, { icon: LucideIcon; tone: string }> = {
  expired: { icon: CalendarClock, tone: 'bg-danger-soft text-danger' },
  grace: { icon: CalendarClock, tone: 'bg-warn-soft text-warn' },
  dues: { icon: Wallet, tone: 'bg-warn-soft text-warn' },
  review: { icon: ClipboardList, tone: 'bg-surface-raised text-ink' },
  ending: { icon: BellRing, tone: 'bg-ink/5 text-ink' },
  noProgram: { icon: Dumbbell, tone: 'bg-ink/5 text-ink' },
};
const VISIBLE = 5;

export function SmartAlerts({ alerts, hideEmptyOnPhone }: { alerts: SmartAlert[]; hideEmptyOnPhone?: boolean }) {
  const t = useT(messages);
  const locale = useLocale();
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? alerts : alerts.slice(0, VISIBLE);
  return (
    <GlassCard role="region" aria-labelledby="alerts-heading"
      className={hideEmptyOnPhone && alerts.length === 0 ? 'min-w-0 space-y-card-gap p-card max-md:hidden' : 'min-w-0 space-y-card-gap p-card'}>
      <div>
        <h2 id="alerts-heading" className="text-xl font-bold">{t('smartAlerts')}</h2>
        <p className="text-sm text-muted">{t('alertsHint')}</p>
      </div>
      {alerts.length === 0 ? <EmptyState icon={CheckCheck} title={t('noAlerts')} body={t('noAlertsBody')} action={{ label: t('goToPlayers'), href: '/captain/players' }} /> : <ul className="space-y-inline">
        {shown.map((alert) => {
          const { icon: Icon, tone } = styles[alert.kind];
          const count = formatNumber(alert.value, locale);
          return <li key={`${alert.kind}:${alert.playerId}`} className="glass-raised flex items-center gap-stack rounded-control p-stack">
            <span aria-hidden className={`grid size-10 shrink-0 place-items-center rounded-full ${tone}`}><Icon className="size-5" /></span>
            <p className="min-w-0 flex-1 text-sm lg:truncate">{t(alert.kind === 'ending' && alert.value === 0 ? 'alert.endingToday' : `alert.${alert.kind}`, { name: alert.name, n: alert.value, count, amount: count })}</p>
            <Link href={alert.href} prefetch={false} className="inline-flex min-h-12 shrink-0 items-center rounded-control px-stack text-sm font-bold text-lime hover:bg-ink/5">
              {t(`action.${alert.kind}`)}
            </Link>
          </li>;
        })}
      </ul>}
      {!expanded && alerts.length > VISIBLE && <Button variant="ghost" className="min-h-12 w-full" aria-expanded={false} onClick={() => setExpanded(true)}>
        {t('showMore', { count: formatNumber(alerts.length - VISIBLE, locale) })}
      </Button>}
    </GlassCard>
  );
}

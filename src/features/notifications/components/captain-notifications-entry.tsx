'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { messages } from '../messages';
import { useNotifications } from '../hooks/use-notifications';
import { importantNotificationHref, medalKey, notificationHref, notificationTextKey, relativeTime } from '../format';
import { captainNotification } from './captain-notification-format';
import { CaptainNotificationsStateEntry } from './captain-notifications-state-entry';
import { Button } from '@/ui/button';

export function CaptainNotificationsEntry() {
  const t = useT(messages);
  const n = useNotifications(true);
  const [now] = useState(() => Date.now());
  if (n.status !== 'ready') return <CaptainNotificationsStateEntry kind={n.status} retry={() => void n.refresh()} />;
  return <>
    <PageBarTitle title={t('title')} />
    <PageBarActions>
      <Button type="button" disabled={n.pending || n.count === 0} onClick={() => void n.read()}
        variant={'secondary'} block={false} className={"hidden min-h-12 px-page-x text-xs font-semibold disabled:opacity-50 md:inline-flex md:items-center"}>
        {t('workspaceMarkAll')}
      </Button>
    </PageBarActions>
    {n.saveError && <p role="alert" className="mb-stack text-sm text-danger">{t('saveError')}</p>}
    <section className="glass rounded-[18px] p-card">
      {n.rows.length === 0 ? <p className="p-card text-sm text-muted">{t('empty')}</p> :
        <ul>{n.rows.map(row => {
          const { Icon, href: baseHref } = captainNotification(row.type);
          const href = importantNotificationHref(row) ?? (row.type === 'player_rank_up' || row.type === 'player_pain' || row.type === 'pain_answered' ? notificationHref(row) : baseHref);
          const time = relativeTime(row.created_at, now);
          return <li key={row.id} className="border-line-soft [&+li]:border-t">
            <Link href={href}
              className={`flex min-h-[50px] w-full items-center gap-stack rounded-xl p-inline text-start hover:bg-surface-raised ${row.is_read ? '' : 'bg-surface-raised'}`}
              onClick={() => { if (!row.is_read) void n.read(row.id); }}>
              <span className="grid size-8 shrink-0 place-items-center rounded-[10px] border border-line-soft bg-surface-raised">
                <Icon aria-hidden className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                {row.type === 'player_pain' && <span className="rounded-full bg-danger-soft px-stack py-inline text-xs text-danger">{t('urgent')}</span>}
                <p className="text-row font-semibold">{t(notificationTextKey(row), {
                  name: row.payload.display_name || row.payload.name || row.payload.captain_name || '',
                  rank: t(medalKey(row.payload.medal) ?? 'iron'),
                  n: row.payload.needs_workouts ?? 0, gap: row.payload.gap ?? 0,
                })}</p>
                <time dateTime={row.created_at} className="block truncate text-micro text-muted">{t(time.key, { n: time.n })}</time>
              </div>
              {!row.is_read && <><span className="text-micro text-muted">{t('unread')}</span><span aria-hidden className="size-2 shrink-0 rounded-full bg-lime" /></>}
            </Link>
          </li>;
        })}</ul>}
    </section>
  </>;
}

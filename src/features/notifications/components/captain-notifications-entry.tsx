'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { messages } from '../messages';
import { useNotifications } from '../hooks/use-notifications';
import { notificationTextKey, relativeTime } from '../format';
import { captainNotification } from './captain-notification-format';
import { CaptainNotificationsStateEntry } from './captain-notifications-state-entry';
import { Button } from '@/ui/button';

export function CaptainNotificationsEntry() {
  const t = useT(messages);
  const n = useNotifications(true);
  const router = useRouter();
  const [now] = useState(() => Date.now());
  if (n.status !== 'ready') return <CaptainNotificationsStateEntry kind={n.status} retry={() => void n.refresh()} />;
  return <>
    <PageBarTitle title={t('title')} />
    <PageBarActions>
      <Button type="button" disabled={n.pending || n.count === 0} onClick={() => void n.read()}
        variant={'secondary'} block={false} className={"hidden min-h-12 px-4 text-xs font-semibold disabled:opacity-50 md:inline-flex md:items-center"}>
        {t('workspaceMarkAll')}
      </Button>
    </PageBarActions>
    {n.saveError && <p role="alert" className="mb-3 text-sm text-danger">{t('saveError')}</p>}
    <section className="glass rounded-[18px] p-3.5">
      {n.rows.length === 0 ? <p className="p-4 text-sm text-muted">{t('empty')}</p> :
        <ul>{n.rows.map(row => {
          const { Icon, href } = captainNotification(row.type);
          const time = relativeTime(row.created_at, now);
          return <li key={row.id} className="border-line-soft [&+li]:border-t">
            <Link href={href} aria-disabled={n.pending}
              className={`flex min-h-[50px] w-full items-center gap-2.5 rounded-xl p-2 text-start hover:bg-surface-raised ${row.is_read ? '' : 'bg-surface-raised'}`}
              onClick={async event => {
                if (n.pending) { event.preventDefault(); return; }
                if (row.is_read) return;
                event.preventDefault();
                if (await n.read(row.id)) router.push(href);
              }}>
              <span className="grid size-8 shrink-0 place-items-center rounded-[10px] border border-line-soft bg-surface-raised">
                <Icon aria-hidden className="size-4" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-semibold">{t(notificationTextKey(row), {
                  name: row.payload.name || row.payload.captain_name || '',
                  n: row.payload.needs_workouts ?? 0, gap: row.payload.gap ?? 0,
                })}</p>
                <time dateTime={row.created_at} className="block truncate text-[11.5px] text-muted">{t(time.key, { n: time.n })}</time>
              </div>
              {!row.is_read && <span aria-hidden className="size-2 shrink-0 rounded-full bg-lime" />}
            </Link>
          </li>;
        })}</ul>}
    </section>
  </>;
}

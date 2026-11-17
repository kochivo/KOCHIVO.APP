'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { PushToggleCard } from '@/features/notifications';
import { publicConfig } from '@/lib/public-config';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import { messages } from '../player-messages';

export function PlayerReminder() {
  const t = useT(messages);
  const locale = useLocale();
  const timezone = useTimezone();
  const { now } = useCalendarClock();
  // The existing workout-reminders cron runs at 06:00 UTC; there is no editable reminder time.
  const at = now ? new Date(now) : null;
  at?.setUTCHours(6, 0, 0, 0);
  const time = at ? new Intl.DateTimeFormat(locale, { timeZone: timezone, hour: 'numeric', hour12: true }).format(at) : null;
  return <div className="px-page-x py-inline">
    <div className="flex min-h-14 items-center gap-stack">
      <span className="flex flex-1 flex-col gap-inline"><span className="text-sm">{t('reminder')}</span>
        {time && <span className="text-xs text-muted">{t('reminderTime', { time })}</span>}</span>
      {!publicConfig.vapidPublicKey && <button type="button" role="switch" aria-checked={false} aria-label={t('reminder')} disabled
        className="flex min-h-12 w-14 items-center rounded-full opacity-50"><span className="relative h-[34px] w-14 rounded-full bg-line"><span className="absolute start-1 top-1 size-[26px] rounded-full bg-muted" /></span></button>}
    </div>
    {publicConfig.vapidPublicKey ? <div className="-mt-12 [&>section]:rounded-none [&>section]:border-0 [&>section]:bg-transparent [&>section]:p-0 [&>section]:shadow-none [&_button[role=switch]]:justify-end [&_button[role=switch]>span:first-child]:sr-only [&_p]:text-xs">
      <PushToggleCard /><p className="mt-inline text-xs text-faint">{t('reminderScope')}</p>
    </div> : <p className="text-xs text-faint">{t('soon')}</p>}
  </div>;
}

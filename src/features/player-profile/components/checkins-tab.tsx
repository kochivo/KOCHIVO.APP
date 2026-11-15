import { getLocale, getT } from '@/core/i18n/server';
import { messages } from '../messages';

import Link from 'next/link';
import { GlassCard } from '@/ui';
import { formatNumber } from '@/lib/format';
import { formatDateAr } from '@/lib/dates';
import { CaptainVoiceNotes } from '@/features/voice-notes';
import type { ProfileCheckIn } from '../types';
import { RemindButton } from './remind-button';
import { ReminderArrival } from './reminder-arrival';

export async function CheckinsTab({ playerId, checkIns }: { playerId: string; checkIns: ProfileCheckIn[] }) {
  const [t, locale] = await Promise.all([getT(messages), getLocale()]);
  const n = (value: number | null, unit: string) => value === null ? t('dash') : `${formatNumber(value, locale)} ${unit}`;
  return (
    <div className="grid items-start gap-card-gap lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      {checkIns.length === 0 ? <RemindButton playerId={playerId} kind="checkins" title={t('noCheckinsTitle')} body={t('noCheckinsBody')} label={t('remindPlayer')} /> :
        <ul className="space-y-stack">{checkIns.map((row) => <li key={row.id}>
          <GlassCard className="space-y-stack p-card">
            <div className="flex flex-wrap items-center justify-between gap-inline">
              <h2 className="font-bold">{t('week', { date: formatDateAr(row.weekStart, { day: 'numeric', month: 'long' }, locale) })}</h2>
              <span className={`rounded-full px-stack py-inline text-xs font-bold ${row.reviewedAt ? 'bg-lime-soft text-lime' : 'bg-warn-soft text-warn'}`}>
                {row.reviewedAt ? t('reviewed') : t('waiting')}
              </span>
            </div>
            <dl className="flex flex-wrap gap-x-section gap-y-inline text-sm">
              <div className="flex gap-inline"><dt className="text-muted">{t('weight')}</dt><dd className="font-bold">{n(row.weightKg, t('kg'))}</dd></div>
              <div className="flex gap-inline"><dt className="text-muted">{t('waist')}</dt><dd className="font-bold">{n(row.waistCm, t('cm'))}</dd></div>
            </dl>
            {row.notes?.trim() && <p className="whitespace-pre-wrap text-sm text-muted">{row.notes}</p>}
            {row.reply ? <p className="glass rounded-control p-stack text-sm"><span className="font-bold">{t('yourReply')}: </span>{row.reply}</p> :
              !row.reviewedAt && <Link href="/captain/inbox" className="inline-flex min-h-12 items-center text-sm font-bold text-lime">{t('openInbox')}</Link>}
          </GlassCard>
        </li>)}</ul>}
      <ReminderArrival playerId={playerId}><CaptainVoiceNotes playerId={playerId} /></ReminderArrival>
    </div>
  );
}

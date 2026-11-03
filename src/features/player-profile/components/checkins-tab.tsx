import { getLocale, getT } from '@/core/i18n/server';
import { messages } from '../messages';

import Link from 'next/link';
import { CalendarCheck } from 'lucide-react';
import { EmptyState, GlassCard } from '@/ui';
import { formatNumber } from '@/lib/format';
import { formatDateAr } from '@/lib/dates';
import { CaptainVoiceNotes } from '@/features/voice-notes';
import type { ProfileCheckIn } from '../types';

export async function CheckinsTab({ playerId, checkIns }: { playerId: string; checkIns: ProfileCheckIn[] }) {
  const [t, locale] = await Promise.all([getT(messages), getLocale()]);
  const n = (value: number | null, unit: string) => value === null ? t('dash') : `${formatNumber(value, locale)} ${unit}`;
  return (
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      {checkIns.length === 0 ? <EmptyState icon={CalendarCheck} title={t('noCheckinsTitle')} body={t('noCheckinsBody')} /> :
        <ul className="space-y-3">{checkIns.map((row) => <li key={row.id}>
          <GlassCard className="space-y-3 p-5">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-bold">{t('week', { date: formatDateAr(row.weekStart, { day: 'numeric', month: 'long' }, locale) })}</h2>
              <span className={`rounded-full px-3 py-1 text-xs font-bold ${row.reviewedAt ? 'bg-lime-soft text-lime' : 'bg-warn-soft text-warn'}`}>
                {row.reviewedAt ? t('reviewed') : t('waiting')}
              </span>
            </div>
            <dl className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
              <div className="flex gap-2"><dt className="text-muted">{t('weight')}</dt><dd className="font-bold">{n(row.weightKg, t('kg'))}</dd></div>
              <div className="flex gap-2"><dt className="text-muted">{t('waist')}</dt><dd className="font-bold">{n(row.waistCm, t('cm'))}</dd></div>
            </dl>
            {row.notes?.trim() && <p className="whitespace-pre-wrap text-sm text-muted">{row.notes}</p>}
            {row.reply ? <p className="glass rounded-control p-3 text-sm"><span className="font-bold">{t('yourReply')}: </span>{row.reply}</p> :
              !row.reviewedAt && <Link href="/captain/inbox" className="inline-flex min-h-12 items-center text-sm font-bold text-lime">{t('openInbox')}</Link>}
          </GlassCard>
        </li>)}</ul>}
      <CaptainVoiceNotes playerId={playerId} />
    </div>
  );
}

import Link from 'next/link';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { messages } from './messages';
import { formatDateAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { FactRow } from '@/ui/fact-row';
import { FileReminder } from './reminder';
import { FileVoiceEntry } from './voice-entry';
import type { Profile } from './types';

export function CheckinList({ playerId, profile, locale }: { playerId: string; profile: Profile; locale: Locale }) {
  const t = createT(messages, locale);
  const n = (value: number | null, unit: string) => value === null ? t('dash') : `${formatNumber(value, locale)} ${unit}`;
  return <div className="grid items-start gap-[18px] min-[1001px]:grid-cols-2">
    <section className="glass rounded-card border border-line-soft p-5">
      <h2 className="mb-3 font-display text-[19px] font-semibold">{t('checkins')}</h2>
      {profile.checkIns.length ? <ul>{profile.checkIns.map(row => <li key={row.id} className="space-y-3 border-t border-line-soft py-4 first:border-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium">{t('week', { date: formatDateAr(row.weekStart, { day: 'numeric', month: 'long' }, locale) })}</h3>
          <span className={`rounded-full px-3 py-1 text-xs ${row.reviewedAt ? 'bg-lime-soft text-lime' : 'bg-warn-soft text-warn'}`}>{t(row.reviewedAt ? 'reviewed' : 'waiting')}</span>
        </div>
        <dl><FactRow label={t('weight')}>{n(row.weightKg, t('kg'))}</FactRow><FactRow label={t('waist')}>{n(row.waistCm, t('cm'))}</FactRow></dl>
        {row.notes?.trim() && <p className="whitespace-pre-wrap text-sm text-muted">{row.notes}</p>}
        {row.reply ? <p className="glass rounded-control p-3 text-sm"><b>{t('yourReply')}: </b>{row.reply}</p> :
          !row.reviewedAt && <Link href="/captain/inbox" className="inline-flex min-h-12 items-center text-sm text-lime">{t('openInbox')}</Link>}
      </li>)}</ul> : <FileReminder playerId={playerId} locale={locale} title={t('noCheckinsTitle')} body={t('noCheckinsBody')} />}
    </section>
    <FileVoiceEntry playerId={playerId} />
  </div>;
}

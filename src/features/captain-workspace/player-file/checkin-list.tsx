import Link from 'next/link';
import Image from 'next/image';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { messages } from './messages';
import { formatDateAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { FactRow } from '@/ui/fact-row';
import { FileReminder } from './reminder';
import { FileVoiceEntry } from './voice-entry';
import type { Profile } from './types';
import { v11Messages } from './v11-messages';

export function CheckinList({ playerId, profile, locale }: { playerId: string; profile: Profile; locale: Locale }) {
  const t = createT(messages, locale);
  const vt = createT(v11Messages, locale);
  const n = (value: number | null, unit: string) => value === null ? t('dash') : `${formatNumber(value, locale)} ${unit}`;
  return <div className="space-y-[18px]">
    <section className="glass rounded-card border border-line-soft p-5">
      <h2 className="mb-3 font-display text-[19px] font-semibold">{t('checkins')}</h2>
      {profile.checkIns.length ? <ul>{profile.checkIns.map(row => <li key={row.id} className="space-y-3 border-t border-line-soft py-4 first:border-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-medium">{t('week', { date: formatDateAr(row.weekStart, { day: 'numeric', month: 'long' }, locale) })}</h3>
          <span className={`rounded-full px-3 py-1 text-xs ${row.reviewedAt ? 'bg-surface text-muted' : 'bg-lime-soft text-lime'}`}>{row.reviewedAt ? t('reviewed') : vt('new')}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-xs text-muted">
          {row.weightKg !== null && <span>{t('weight')} {n(row.weightKg, t('kg'))}</span>}
          <span>{vt('photoCount', { count: formatNumber(row.photoCount ?? row.photos.length, locale) })}</span>
        </div>
        <details><summary className="glass inline-flex min-h-12 cursor-pointer items-center rounded-full px-4 text-sm">{vt('open')}</summary>
        <dl>{row.waistCm !== null && <FactRow label={t('waist')}>{n(row.waistCm, t('cm'))}</FactRow>}
          {row.bodyFatPct != null && <FactRow label={vt('bodyFat')}>{formatNumber(row.bodyFatPct, locale)}%</FactRow>}
        </dl>
        {row.photoError && <p role="alert" className="text-sm text-danger">{t('error')}</p>}
        {row.photos.length > 0 && <div className="grid grid-cols-2 gap-2">{row.photos.map(url =>
          <Image key={url} src={url} alt={vt('photos')} width={320} height={320} unoptimized className="h-56 w-full rounded-control object-cover" />)}</div>}
        {row.notes?.trim() && <p className="whitespace-pre-wrap text-sm text-muted">{row.notes}</p>}
        {row.reply ? <p className="glass rounded-control p-3 text-sm"><b>{t('yourReply')}: </b>{row.reply}</p> :
          !row.reviewedAt && <Link href="/captain/inbox" className="glass inline-flex min-h-12 items-center rounded-full border border-line px-4 text-sm text-ink">{t('openInbox')}</Link>}
        </details>
      </li>)}</ul> : <FileReminder playerId={playerId} locale={locale} title={t('noCheckinsTitle')} body={t('noCheckinsBody')} />}
    </section>
    <FileVoiceEntry playerId={playerId} />
  </div>;
}

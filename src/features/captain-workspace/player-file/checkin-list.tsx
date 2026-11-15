import { RowLink } from '@/ui/row-link';
import { Disclosure } from '@/ui/disclosure';
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
  return <div className="space-y-card-gap">
    <section className="glass rounded-card border border-line-soft p-card">
      <h2 className="mb-stack font-display text-title font-semibold">{t('checkins')}</h2>
      {profile.checkIns.length ? <ul>{profile.checkIns.map(row => <li key={row.id} className="space-y-stack border-t border-line-soft py-page-y first:border-0">
        <div className="flex flex-wrap items-center justify-between gap-inline">
          <h3 className="font-medium">{t('week', { date: formatDateAr(row.weekStart, { day: 'numeric', month: 'long' }, locale) })}</h3>
          <span className={`rounded-full px-stack py-inline text-xs ${row.reviewedAt ? 'bg-surface text-muted' : 'bg-lime-soft text-lime'}`}>{row.reviewedAt ? t('reviewed') : vt('new')}</span>
        </div>
        <div className="flex flex-wrap items-center gap-stack text-xs text-muted">
          {row.weightKg !== null && <span>{t('weight')} {n(row.weightKg, t('kg'))}</span>}
          <span>{vt('photoCount', { count: formatNumber(row.photoCount ?? row.photos.length, locale) })}</span>
        </div>
        <Disclosure label={vt('open')} className="glass text-sm">
        <dl>{row.waistCm !== null && <FactRow label={t('waist')}>{n(row.waistCm, t('cm'))}</FactRow>}
          {row.bodyFatPct != null && <FactRow label={vt('bodyFat')}>{formatNumber(row.bodyFatPct, locale)}%</FactRow>}
        </dl>
        {row.photoError && <p role="alert" className="text-sm text-danger">{t('error')}</p>}
        {row.photos.length > 0 && <div className="grid grid-cols-2 gap-inline">{row.photos.map(url =>
          <Image key={url} src={url} alt={vt('photos')} width={320} height={320} unoptimized className="h-56 w-full rounded-control object-cover" />)}</div>}
        {row.notes?.trim() && <p className="whitespace-pre-wrap text-sm text-muted">{row.notes}</p>}
        {row.reply ? <p className="glass rounded-control p-stack text-sm"><b>{t('yourReply')}: </b>{row.reply}</p> :
          !row.reviewedAt && <RowLink href="/captain/inbox" className="glass mt-stack text-sm">{t('openInbox')}</RowLink>}
        </Disclosure>
      </li>)}</ul> : <FileReminder playerId={playerId} locale={locale} title={t('noCheckinsTitle')} body={t('noCheckinsBody')} />}
    </section>
    <FileVoiceEntry playerId={playerId} />
  </div>;
}

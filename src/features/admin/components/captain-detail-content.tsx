'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button, buttonClass } from '@/ui/button';
import { messages } from '../dashboard/messages';
import { messages as baseMessages } from '../messages';
import { whatsappLink } from '../dashboard-ui';
import { endsLabel, tierLabel } from '../format';
import type { AdminCaptainDetail } from '../dashboard-types';
import type { CaptainRow } from '../types';

export function CaptainDetailContent({ captain, detail, section = 'all' }: {
  captain: CaptainRow; detail: AdminCaptainDetail; section?: 'stats' | 'history' | 'all';
}) {
  const t = useT(messages); const b = useT(baseMessages); const locale = useLocale();
  const url = whatsappLink(detail.phone, t('renewal', { tier: tierLabel(captain.tier), date: endsLabel(captain.tier_ends_at, locale) }));
  return <>
    {section !== 'history' && <dl className="grid grid-cols-3 gap-inline">
      {([['players', detail.players], ['trained', detail.trainedThisWeek], ['totalPaid', detail.totalPaidEgp]] as const).map(([key, value]) =>
        <div key={key} className="glass-strong rounded-control p-stack"><dt className="text-micro text-muted">{t(key)}</dt>
          <dd className="num mt-inline text-title font-extrabold">{formatNumber(value, locale)}</dd></div>)}
    </dl>}
    {section !== 'stats' && <>
      {url ? <a href={url} target="_blank" rel="noopener noreferrer" className={buttonClass({ variant: 'secondary', block: true })}>{t('whatsapp')}</a>
        : <div><Button variant="secondary" disabled className="w-full" aria-describedby="phone-hint">{t('whatsapp')}</Button><p id="phone-hint" className="mt-inline text-xs text-muted">{t('noPhone')}</p></div>}
      <h3 className="text-md font-semibold">{t('history')}</h3>
      {detail.history.length ? <ol className="space-y-stack border-s border-line ps-stack">{detail.history.map((item, index) => <li key={`${item.startsAt}-${index}`} className="space-y-inline text-row">
        <div className="flex flex-wrap justify-between gap-inline"><span className="font-semibold">{tierLabel(item.tier)}</span><span className="num">{b('months', { n: item.months, count: formatNumber(item.months, locale) })}</span></div>
        <p className="text-xs text-muted">{endsLabel(item.startsAt, locale)} · {endsLabel(item.endsAt, locale)}</p>
        <p className="num text-xs">{b('currency', { amount: formatNumber(item.amountEgp, locale) })}</p>
        {item.paymentRef && <p className="break-all text-xs text-muted">{item.paymentRef}</p>}
      </li>)}</ol> : <p className="text-sm text-muted">{t('noHistory')}</p>}
    </>}
  </>;
}

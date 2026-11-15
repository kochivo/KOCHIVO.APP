'use client';
import Image from 'next/image';
import { useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { formatTimestampAr } from '@/lib/dates';
import { messages } from './messages';
import type { ReceiptReview } from './types';
import { Button } from '@/ui/button';
export function ReceiptReviewRow({ receipt, first, busy, onDecide }: { receipt: ReceiptReview; first: boolean; busy: boolean;
  onDecide: (receipt: ReceiptReview, days: number | null, reason?: string) => Promise<void> }) {
  const t = useT(messages), locale = useLocale();
  const [declining, setDeclining] = useState(false), [reason, setReason] = useState(''), [days, setDays] = useState('');
  const [expanded, setExpanded] = useState(false);
  const validDays = !!receipt.renewal_request_id || (Number.isInteger(Number(days)) && Number(days) >= 1 && Number(days) <= 365);
  return <li id={`receipt-${receipt.id}`} className="space-y-3 border-t border-line-soft py-4 first:border-0">
    <div className="flex flex-wrap items-center gap-3">
      <Button type="button" onClick={() => setExpanded(!expanded)} aria-expanded={expanded} aria-label={t('image')} variant={'secondary'} block={false} className={"min-h-12 shrink-0 overflow-hidden"}>
        <Image src={receipt.url} alt={t('image')} width={64} height={85} unoptimized className="h-20 w-16 object-cover" /></Button>
      <div className="min-w-0 flex-1"><b className="block text-sm">{receipt.name}</b>
        <p className="mt-1 text-xs text-muted">{receipt.method && <>{t(receipt.method)} · </>}{t('currency', { amount: formatNumber(receipt.amount_egp, locale) })}</p>
        <time dateTime={receipt.created_at} className="text-xs text-faint">{formatTimestampAr(receipt.created_at, {
          day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit',
        }, locale)}</time>
        {receipt.packageName && <p className="text-xs text-muted">{t('package', { name: receipt.packageName })}</p>}
      </div>
      <Button type="button" disabled={busy} onClick={() => setDeclining(!declining)} variant={'secondary'} block={false} className={"min-h-12 px-4 text-sm disabled:opacity-50"}>{t('decline')}</Button>
      <Button type="button" disabled={busy || !validDays} onClick={() => void onDecide(receipt, receipt.renewal_request_id ? null : Number(days))}
        variant={(first) ? 'primary' : 'secondary'} block={false} className={`min-h-12 px-4 text-sm font-semibold disabled:opacity-50 ${first ? "" : ""} `}>{t('accept')}</Button>
    </div>
    {expanded && <Image src={receipt.url} alt={t('image')} width={800} height={1000} unoptimized className="glass-strong max-h-[65dvh] w-full rounded-control object-contain" />}
    {!receipt.renewal_request_id && <label className="block space-y-1 text-sm"><span>{t('days')}</span>
      <input type="number" min={1} max={365} step={1} disabled={busy} value={days} onChange={event => setDays(event.target.value)}
        className="glass ms-3 min-h-12 w-28 rounded-control border border-line px-3" aria-label={t('days')} />
      <small className="block text-faint">{t('daysHint')}</small></label>}
    {declining && <form className="flex flex-wrap gap-2" onSubmit={event => { event.preventDefault(); if (reason.trim()) void onDecide(receipt, null, reason.trim()); }}>
      <label className="flex-1 space-y-1 text-sm"><span>{t('reason')}</span>
        <input required maxLength={200} value={reason} onChange={event => setReason(event.target.value)} disabled={busy} aria-describedby={`reason-hint-${receipt.id}`}
          className="glass min-h-12 w-full rounded-control border border-line px-3" /><small id={`reason-hint-${receipt.id}`} className="block text-faint">{t('reasonHint')}</small></label>
      <Button type="submit" disabled={busy || !reason.trim()} variant={'secondary'} block={false} className={"min-h-12 self-center px-4"}>{t('decline')}</Button>
    </form>}
  </li>;
}

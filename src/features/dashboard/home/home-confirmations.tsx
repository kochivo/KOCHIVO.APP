import Link from 'next/link';
import { Banknote, UserPlus } from 'lucide-react';
import { JoinRequestsList } from '@/features/coach-page';
import { getLocale, getT } from '@/core/i18n/server';
import { formatNumber } from '@/lib/format';
import { homeV11Messages } from './messages';
import { HomePanelEntry } from './home-panel-entry';

export async function HomeConfirmations({ requests, payments, paymentsFailed }: {
  requests: { id: string; name: string }[]; payments: { id: string; name: string }[]; paymentsFailed: boolean;
}) {
  const [t, locale] = await Promise.all([getT(homeV11Messages), getLocale()]);
  return <section className="glass min-w-0 rounded-[18px] p-[18px]">
    <h2 className="mb-2.5 text-[15px] font-semibold">{t('confirmation')}</h2>
    {paymentsFailed ? <p role="alert" className="px-2 py-4 text-sm text-danger">{t('paymentsFailed')}</p> : payments.length ?
      <Link href="/captain/billing" className="flex min-h-[58px] items-center gap-3 rounded-xl p-2.5 text-start">
        <span className="grid size-[38px] shrink-0 place-items-center rounded-xl border border-line bg-surface-raised"><Banknote className="size-4" aria-hidden /></span>
        <div className="min-w-0 flex-1"><b className="block text-sm font-semibold">{t('pendingPayments', { n: payments.length, count: formatNumber(payments.length, locale) })}</b>
          <small className="block truncate text-xs text-muted">{payments.map(row => row.name).join(t('joinNames'))}</small></div>
        <span className="rounded-full bg-lime-soft px-2.5 py-1 text-xs font-medium text-lime">{formatNumber(payments.length, locale)}</span>
      </Link> : <p className="px-2 py-4 text-sm text-muted">{t('noPayments')}</p>}
    {requests.length ? <HomePanelEntry id="home-join-requests" title={t('requests', { count: formatNumber(requests.length, locale) })}
      content={<JoinRequestsList rows={requests.map(row => ({ id: row.id, full_name: row.name }))} />}
      className="flex min-h-[58px] w-full items-center gap-3 rounded-xl p-2.5 text-start">
      <span className="grid size-[38px] shrink-0 place-items-center rounded-xl border border-line bg-surface-raised"><UserPlus className="size-4" aria-hidden /></span>
      <div className="min-w-0 flex-1"><b className="block text-sm font-semibold">{t('requests', { count: formatNumber(requests.length, locale) })}</b>
        <small className="block truncate text-xs text-muted">{requests.map(row => row.name).join(t('joinNames'))}</small></div>
      <span className="rounded-full bg-lime-soft px-2.5 py-1 text-xs font-medium text-lime">{formatNumber(requests.length, locale)}</span>
    </HomePanelEntry> : <p className="px-2 py-4 text-sm text-muted">{t('noRequests')}</p>}
  </section>;
}

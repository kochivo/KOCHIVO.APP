import Link from 'next/link';
import { Banknote } from 'lucide-react';
import { getLocale, getT } from '@/core/i18n/server';
import { formatNumber } from '@/lib/format';
import { homeV11Messages } from './messages';
import { HomeJoinConfirmations } from './home-join-confirmations';

export async function HomeConfirmations({ requests, retryRequests, payments, paymentsFailed }: {
  requests: { id: string; name: string }[] | null;
  retryRequests?: () => Promise<{ id: string; name: string }[] | null>;
  payments: { id: string; name: string }[]; paymentsFailed: boolean;
}) {
  const [t, locale] = await Promise.all([getT(homeV11Messages), getLocale()]);
  return <section className="glass min-w-0 rounded-[18px] p-card">
    <h2 className="mb-stack text-md font-semibold">{t('confirmation')}</h2>
    {paymentsFailed ? <p role="alert" className="px-inline py-page-y text-sm text-danger">{t('paymentsFailed')}</p> : payments.length ?
      <Link href="/captain/billing" className="flex min-h-[58px] items-center gap-stack rounded-xl p-stack text-start">
        <span className="grid size-[38px] shrink-0 place-items-center rounded-xl border border-line bg-surface-raised"><Banknote className="size-4" aria-hidden /></span>
        <div className="min-w-0 flex-1"><b className="block text-sm font-semibold">{t('pendingPayments', { n: payments.length, count: formatNumber(payments.length, locale) })}</b>
          <small className="block truncate text-xs text-muted">{payments.map(row => row.name).join(t('joinNames'))}</small></div>
        <span className="rounded-full bg-lime-soft px-stack py-inline text-xs font-medium text-lime">{formatNumber(payments.length, locale)}</span>
      </Link> : <p className="px-inline py-page-y text-sm text-muted">{t('noPayments')}</p>}
    <HomeJoinConfirmations requests={requests} retryAction={retryRequests} />
  </section>;
}

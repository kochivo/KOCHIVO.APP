'use client';
import { secondaryButtonClass } from '@/ui/secondary-button-class';
import { use, useCallback, useRef, useState, useTransition } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { Bell, Box } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { useResource } from '@/core/resource';
import { formatDateAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { useToast } from '@/ui/toast';
import { messages, workspaceMessages } from '../messages';
import { messages as financeMessages } from '../workspace/messages';
import { listRenewalRequests, decideRenewalRequest } from '../data/renewal-requests';
import { reminderText, waLink } from '../renew';
import { CaptainReceipts } from '../receipts/captain-receipts';
import type { BillingResult } from '../types';
import { activeSubscription, expectedIncome, expiringSoon, paymentRows, subscriptionTiles } from './workspace-billing-summary';
import { WorkspaceBillingTiles } from './workspace-billing-tiles';
import { WorkspaceBillingPhoneIncome } from './workspace-billing-phone-income';
import { KoPackages } from '@/ui/icons/ko-packages';
import { WorkspaceBillingTask } from './workspace-billing-task';
import { WorkspacePaymentsTable } from './workspace-payments-table';
import { buttonClass, Button } from '@/ui/button';

export function WorkspaceBilling({ data, today, moneyOwed }: { data: Promise<BillingResult>; today: string; moneyOwed?: ReactNode }) {
  const result = use(data), t = useT(workspaceMessages), legacy = useT(messages), finance = useT(financeMessages), locale = useLocale(), router = useRouter();
  const timezone = useTimezone();
  const toast = useToast(), lock = useRef(false);
  const load = useCallback(() => listRenewalRequests(), []);
  const requests = useResource('billing:renewal-requests:all', load);
  const [approved, setApproved] = useState<string[]>([]);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('');
  const [refreshing, start] = useTransition();
  const billing = result.data;
  if (!billing) return <ErrorState message={result.error ?? legacy('loadFailed')} retryLabel={legacy('retry')} onRetry={() => start(() => router.refresh())} />;
  const rows = requests.data?.data?.filter(row => !approved.includes(row.id));
  const values = subscriptionTiles(billing.players, today, billing.revenue.thisMonth, rows?.length ?? 0);
  const ending = expiringSoon(billing.players, today);
  const payments = paymentRows(billing.players, billing.packages, today);
  const noPackage = payments.filter(row => !row.hasPackage && activeSubscription(row.player, today)).length;
  const expected = expectedIncome(payments, values.income, today, timezone);
  async function confirm(id: string, name: string) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true); setError(''); setNotice('');
    setApproved(current => [...current, id]);
    try {
      const result = await decideRenewalRequest(id, 'approved');
      if (result.error) { setApproved(current => current.filter(value => value !== id)); setError(result.error); return; }
      const text = result.fallback ? t('fallback') : t('saved', { name });
      setNotice(text); toast.success(text);
      await requests.retry(); router.refresh();
    } catch { setApproved(current => current.filter(value => value !== id)); setError(legacy('renewFailed')); }
    finally { setBusy(false); lock.current = false; }
  }
  return <section id="billing-heading" tabIndex={-1} className="flex min-w-0 flex-col gap-card-gap" aria-busy={busy || refreshing}>
    <PageBarTitle title={t('title')} subtitle={t('intro')} />
    <PageBarActions>
      <Link href="/captain/billing/packages" aria-label={t('catalog')}
        className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 min-w-12 items-center px-page-x text-row max-md:px-inline!" })}>
        <Box aria-hidden className="size-4 max-md:hidden" /><KoPackages aria-hidden className="size-5 md:hidden" />
        <span className="max-md:sr-only">{t('catalog')}</span></Link>
    </PageBarActions>
    <WorkspaceBillingTiles values={values} owed={billing.revenue.dues} owing={billing.revenue.owing}
      today={today} expected={expected} noPackage={noPackage} className="max-md:hidden" />
    <WorkspaceBillingPhoneIncome income={values.income} expected={expected} waiting={billing.revenue.dues} />
    {notice && <p role="status" className="glass rounded-control p-stack text-sm text-lime">{notice}</p>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <div className="group hidden has-[[data-billing-task]]:block has-[[data-billing-feedback]]:block max-md:order-last">
      <section className="rounded-card has-[[data-billing-task]]:border has-[[data-billing-task]]:border-warn/25 has-[[data-billing-task]]:bg-ink/3">
        <header className="hidden items-center gap-stack px-card py-stack group-has-[[data-billing-task]]:flex">
          <Bell aria-hidden className="size-4 text-warn" /><h2 className="text-md font-bold">{t('attention')}</h2>
        </header>
        {moneyOwed}
        <CaptainReceipts workspace />
        {requests.error || requests.data?.error ? <div data-billing-feedback><ErrorState message={legacy('loadFailed')} retryLabel={legacy('retry')} onRetry={() => void requests.retry()} /></div>
          : !rows ? <div data-billing-feedback><LoadingState variant="detail" /></div> : rows.length > 0 &&
          <WorkspaceBillingTask label={t('pending')} count={formatNumber(rows.length, locale)}><ul>{rows.map(row => <li key={row.id} className="flex items-center gap-inline border-t border-line-soft py-stack first:border-0">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-raised">{row.name.slice(0, 1)}</span>
            <div className="min-w-0 flex-1"><b className="block break-words text-sm">{row.name}</b><small className="text-xs text-muted">{t('renewalRequest', { package: row.package })}</small></div>
            <Button disabled={busy} onClick={() => void confirm(row.id, row.name)} variant="secondary" block={false} className="shrink-0">{t('confirm')}</Button>
          </li>)}</ul></WorkspaceBillingTask>}
        {ending.length > 0 && <WorkspaceBillingTask label={t('soon')} count={formatNumber(ending.length, locale)}><ul>{ending.map(player => {
          const reminder = waLink(player.phone, reminderText(player.fullName, player.accessUntil, locale));
          return <li key={player.playerId} className="flex items-center gap-inline border-t border-line-soft py-stack first:border-0">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-raised">{player.fullName.slice(0, 1)}</span>
            <div className="min-w-0 flex-1"><b className="block break-words text-sm">{player.fullName}</b>
              <small className="text-xs text-muted">{t('endsOn', { date: formatDateAr(player.accessUntil, { day: 'numeric', month: 'long' }, locale) })}</small></div>
            <Button disabled={!reminder} title={!reminder ? finance('noPhone') : undefined}
              onClick={() => { if (reminder) window.open(reminder, '_blank', 'noopener,noreferrer'); }} variant="secondary" block={false} className="shrink-0">{legacy('remind')}</Button>
          </li>;
        })}</ul></WorkspaceBillingTask>}
      </section>
    </div>
    <WorkspacePaymentsTable players={billing.players} packages={billing.packages} today={today} rows={payments} phone
      summary={<p className="w-full text-xs text-muted">
        {t('activeSubscriptions')} <bdi>{formatNumber(values.active, locale)}</bdi>
        {noPackage > 0 && <span className="ms-inline">{t('withoutPackages', { count: formatNumber(noPackage, locale) })}</span>}
        {billing.revenue.owing > 0 && <span className="ms-inline">{legacy('owingPlayers', {
          n: billing.revenue.owing, count: formatNumber(billing.revenue.owing, locale),
        })}</span>}
      </p>} />
    {!billing.players.length && <div className="glass rounded-card p-card"><p className="text-sm text-faint">{legacy('noPlayers')}</p><Link href="/captain/players" className={`${secondaryButtonClass} inline-flex min-h-12 items-center text-lime`}>{legacy('invitePlayer')}</Link></div>}
  </section>;
}

'use client';
import { use, useCallback, useRef, useState, useTransition } from 'react';
import type { ReactNode } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useLocale, useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { daysBetween } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { PageBarTitle } from '@/ui/page-bar-title';
import { PageBarActions } from '@/ui/page-bar-actions';
import { useToast } from '@/ui/toast';
import { messages, workspaceMessages } from '../messages';
import { listRenewalRequests, decideRenewalRequest } from '../data/renewal-requests';
import { reminderText, waLink } from '../renew';
import type { BillingResult } from '../types';
import { expiringSoon, subscriptionTiles } from './workspace-billing-summary';
import { WorkspaceBillingTiles } from './workspace-billing-tiles';
import { WorkspacePaymentsTable } from './workspace-payments-table';
import { buttonClass, Button } from '@/ui/button';
const CaptainReceipts = dynamic(() => import('../receipts/captain-receipts').then(module => module.CaptainReceipts));

export function WorkspaceBilling({ data, today, moneyOwed }: { data: Promise<BillingResult>; today: string; moneyOwed?: ReactNode }) {
  const result = use(data), t = useT(workspaceMessages), legacy = useT(messages), locale = useLocale(), router = useRouter();
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
  return <section id="billing-heading" tabIndex={-1} className="space-y-[18px]" aria-busy={busy || refreshing}>
    <PageBarTitle title={t('title')} />
    <PageBarActions>
      <Link href="/captain/billing/packages" className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center px-4 text-[13px]" })}>{t('catalog')}</Link>
    </PageBarActions>
    <WorkspaceBillingTiles values={{ ...values, pending: rows ? rows.length : null }} />
    {moneyOwed}
    <CaptainReceipts />
    {notice && <p role="status" className="glass rounded-control p-3 text-sm text-lime">{notice}</p>}
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <div className="grid items-start gap-3.5 min-[761px]:grid-cols-2">
      <section className="glass min-w-0 rounded-card border border-line-soft p-[18px]">
        <header className="mb-2 flex items-center justify-between gap-2"><h2 className="font-semibold">{t('pending')}</h2>
          {rows && <span className="rounded-full bg-surface-raised px-2.5 py-1 text-xs tabular-nums">{formatNumber(rows.length, locale)}</span>}</header>
        {requests.error || requests.data?.error ? <ErrorState message={legacy('loadFailed')} retryLabel={legacy('retry')} onRetry={() => void requests.retry()} />
          : !rows ? <LoadingState variant="detail" /> : rows.length ? <ul>{rows.map(row => <li key={row.id} className="flex items-center gap-2 border-t border-line-soft py-3 first:border-0">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-raised">{row.name.slice(0, 1)}</span>
            <div className="min-w-0 flex-1"><b className="block break-words text-sm">{row.name}</b><small className="text-xs text-muted">{t('renewalRequest', { package: row.package })}</small></div>
            <Button disabled={busy} onClick={() => void confirm(row.id, row.name)} type="submit" variant={'primary'} block={false} className={"min-h-12 shrink-0 px-4 text-sm font-semibold disabled:opacity-50"}>{t('confirm')}</Button>
          </li>)}</ul> : <p className="py-3 text-sm text-faint">{t('noRequests')}</p>}
      </section>
      <section className="glass min-w-0 rounded-card border border-line-soft p-[18px]">
        <header className="mb-2 flex items-center justify-between gap-2"><h2 className="font-semibold">{t('soon')}</h2><span className="rounded-full bg-surface-raised px-2.5 py-1 text-xs tabular-nums">{formatNumber(ending.length, locale)}</span></header>
        {ending.length ? <ul>{ending.map(player => {
          const reminder = waLink(player.phone, reminderText(player.fullName, player.accessUntil, locale));
          return <li key={player.playerId} className="flex items-center gap-2 border-t border-line-soft py-3 first:border-0">
            <span aria-hidden className="grid size-10 shrink-0 place-items-center rounded-full bg-surface-raised">{player.fullName.slice(0, 1)}</span>
            <div className="min-w-0 flex-1"><b className="block break-words text-sm">{player.fullName}</b><small className="text-xs text-muted">{t('after', { n: daysBetween(today, player.accessUntil) })}</small></div>
            <Button disabled={!reminder} onClick={() => { if (reminder) window.open(reminder, '_blank', 'noopener,noreferrer'); }} type="submit" variant={'secondary'} block={false} className={"min-h-12 shrink-0 px-4 text-sm disabled:opacity-40"}>{legacy('remind')}</Button>
          </li>;
        })}</ul> : <p className="py-3 text-sm text-faint">{t('noExpiring')}</p>}
      </section>
    </div>
    <WorkspacePaymentsTable players={billing.players} packages={billing.packages} today={today} />
    {!billing.players.length && <div className="glass rounded-card p-5"><p className="text-sm text-faint">{legacy('noPlayers')}</p><Link href="/captain/players" className="inline-flex min-h-12 items-center text-lime">{legacy('invitePlayer')}</Link></div>}
  </section>;
}

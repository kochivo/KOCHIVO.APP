'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useT } from '@/core/i18n/client';
import { Button } from '@/ui';
import { balanceLabel } from '../balance';
import { loadPlayerBalance, activatePlayer, setPlayerFrozen } from '../data/pt-actions';
import { renewPlayer } from '../data/billing';
import { messages } from '../packages/messages';
import type { Activation } from '../pt-types';
import { ActivateSheet } from './activate-sheet';
import { RenewSheet } from './renew-sheet';
import type { Renewal } from './renew-sheet';
import { messages as choiceMessages } from '../choice/messages';
import { RequestsEntry } from '../choice/requests-entry';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { messages as freezeMessages } from '../freeze/messages';
import { formatDateAr } from '@/lib/dates';

export function BillingManagerCard({ playerId, name, today, autoActivate, workspace = false }: { playerId: string; name: string; today: string; autoActivate?: boolean; workspace?: boolean }) {
  const t = useT(messages), locale = useLocale(), router = useRouter();
  const ct = useT(choiceMessages);
  const ft = useT(freezeMessages);
  const [data, setData] = useState<Awaited<ReturnType<typeof loadPlayerBalance>>['data']>();
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState<'activate' | 'renew' | null>(autoActivate ? 'activate' : null);
  const lock = useRef(false);
  const [notice, setNotice] = useState('');
  const load = useCallback(async () => {
    try { const result = await loadPlayerBalance(playerId); setData(result.data); setError(result.error ?? ''); }
    catch { setError(t('error')); }
  }, [playerId, t]);
  useEffect(() => { void Promise.resolve().then(load); }, [load]);
  async function run(action: () => Promise<{ error?: string; fallback?: boolean }>, optimistic?: NonNullable<typeof data>) {
    if (lock.current) return;
    lock.current = true; setBusy(true); setError('');
    const previous = data;
    if (optimistic) setData(optimistic);
    try {
      const result = await action();
      if (result.error) { setError(result.error); setData(previous); }
      else { if (result.fallback) setNotice(ct('expired')); setSheet(null); await load(); router.refresh(); }
    } catch { setError(t('error')); setData(previous); }
    finally { lock.current = false; setBusy(false); }
  }
  const balance = data?.balance;
  return <section className="glass-strong space-y-stack rounded-card p-card" aria-busy={busy}>
    {notice && <p role="status" className="text-warn">{notice}</p>}
    {!balance ? error ? <><p role="alert" className="text-danger">{error}</p><Button variant="secondary" onClick={() => void load()}>{t('retry')}</Button></>
      : <p role="status">{t('loading')}</p> : <>
      <p className="text-xl font-bold">{balanceLabel(balance, today, locale)}</p>
      {balance.frozen_at && <span className="rounded-control bg-water/10 px-stack py-inline text-water">{t('frozen')}</span>}
      {balance.frozen_until && <p className="text-warn">{ft('until', { date: formatDateAr(balance.frozen_until, { day: 'numeric', month: 'long', year: 'numeric' }, locale) })}</p>}
      <div className="flex flex-wrap gap-inline">
        {balance.pending ? <Button disabled={busy} onClick={() => setSheet('activate')}>{t('activate')}</Button> : <>
          <Button className="w-auto flex-1" disabled={busy || Boolean(balance.frozen_at)} onClick={() => setSheet('renew')}>{t(balance.frozen_at ? 'unfreezeFirst' : 'renew')}</Button>
          <Button variant="secondary" className="flex-1 text-muted hover:text-ink" disabled={busy} onClick={() => {
            if (window.confirm(t('confirm'))) void run(() => setPlayerFrozen(balance.id, !balance.frozen_at),
              { ...data, balance: { ...balance, frozen_at: balance.frozen_at ? null : `${today}T12:00:00Z`, frozen_until: null } });
          }}>{t(balance.frozen_at ? 'unfreeze' : 'freeze')}</Button>
        </>}
      </div>
      {error && <p role="alert" className="text-danger">{error}</p>}
      {captainWorkspaceEnabled() && !balance.pending && <RequestsEntry playerId={playerId} onDecided={() => void load()} />}
      {sheet === 'activate' && <ActivateSheet packages={data.packages} selectedPackageId={data.selectedPackageId} busy={busy} error={error} onClose={() => setSheet(null)}
        onSave={(input: Activation) => void run(() => activatePlayer(balance.id, input))} />}
      {sheet === 'renew' && !balance.frozen_at && <RenewSheet name={name} accessUntil={balance.access_until} today={today} packages={data.packages}
        onClose={() => { if (!busy) setSheet(null); }} onSave={(input: Renewal) => { if (!workspace) setSheet(null); void run(() => renewPlayer({ playerId, ...input })); }} {...(workspace ? { busy, error } : {})} />}
    </>}
  </section>;
}

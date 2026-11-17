'use client';
import { useRef, useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { uuidv7 } from '@/core/offline/ids';
import { formatDateAr } from '@/lib/dates';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { loadFreezeState, sendFreezeRequest, cancelFreezeRequest } from '../data/freeze-requests';
import { messages } from './messages';
import { RequestSheet } from './request-sheet';

export function PlayerFreeze() {
  const t = useT(messages), locale = useLocale();
  const resource = useResource('billing:player-freeze', loadFreezeState, { pollMs: 30_000 });
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const inFlight = useRef(false);
  const data = resource.data?.data;
  async function change(days?: number, note: string | null = null) {
    if (!data || inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setNotice(''); setOpen(false);
    const id = days === undefined ? data.pendingId : uuidv7();
    if (!id) { inFlight.current = false; setBusy(false); return; }
    try {
      const ok = await resource.mutate(current => ({ data: { ...(current?.data ?? data), pendingId: days === undefined ? null : id } }), async () => {
        const result = days === undefined ? await cancelFreezeRequest(id) : await sendFreezeRequest({ id, captainId: data.captainId, days, note });
        if (result.error) throw new Error(result.error);
      });
      if (ok) { setNotice(t(days === undefined ? 'cancelled' : 'sent')); await resource.retry(); }
      else setError(t('error'));
    } catch { setError(t('error')); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <div className="space-y-stack" aria-busy={busy}>
    {(error || resource.error || resource.data?.error) && <div role="alert" className="space-y-stack text-danger">
      <p>{error || t('error')}</p><Button variant="secondary" onClick={() => { setError(''); void resource.retry(); }}>{t('retry')}</Button>
    </div>}
    {!resource.data && !resource.error && <LoadingState variant="detail" />}
    {notice && <p role="status" className="text-lime">{notice}</p>}
    {data?.frozenUntil ? <p className="text-warn">{t('until', { date: formatDateAr(data.frozenUntil, { day: 'numeric', month: 'long', year: 'numeric' }, locale) })}</p>
      : data?.pendingId ? <><p role="status">{t('pending')}</p><Button variant="secondary" disabled={busy} onClick={() => void change()}>{t('cancel')}</Button></>
      : data && data.remaining > 0 && <><p className="text-sm text-muted">{t('remaining', { count: formatNumber(data.remaining, locale) })}</p>
        <Button id="freeze-request-trigger" variant="secondary" disabled={busy} onClick={() => setOpen(true)}>{t('request')}</Button></>}
    {open && data && <RequestSheet remaining={data.remaining} onClose={() => setOpen(false)} onSend={(days, note) => void change(days, note)} />}
  </div>;
}

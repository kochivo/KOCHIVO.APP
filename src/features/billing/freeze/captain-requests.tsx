'use client';
import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { listFreezeRequests, decideFreezeRequest } from '../data/freeze-requests';
import { messages } from './messages';

export function CaptainFreezeRequests({ playerId, onDecided }: { playerId?: string; onDecided?: () => void }) {
  const t = useT(messages), locale = useLocale(), router = useRouter();
  const load = useCallback(() => listFreezeRequests(playerId), [playerId]);
  const resource = useResource(`billing:freeze-requests:${playerId ?? 'all'}`, load, { pollMs: 30_000 });
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [notice, setNotice] = useState('');
  const inFlight = useRef(false);
  async function decide(id: string, approve: boolean) {
    if (inFlight.current) return;
    inFlight.current = true; setBusy(true); setError(''); setNotice('');
    try {
      const ok = await resource.mutate(current => ({ data: current?.data?.filter(row => row.id !== id) ?? [] }), async () => {
        const result = await decideFreezeRequest(id, approve);
        if (result.error) throw new Error(result.error);
      });
      if (ok) { setNotice(t('saved')); await resource.retry(); onDecided?.(); router.refresh(); }
      else setError(t('error'));
    } catch { setError(t('error')); }
    finally { inFlight.current = false; setBusy(false); }
  }
  return <section className="glass space-y-stack rounded-card border border-line-soft p-card" aria-busy={busy}>
    <h2 className="font-display text-title font-semibold">{t('requests')}</h2>
    {notice && <p role="status" className="text-lime">{notice}</p>}
    {(error || resource.error || resource.data?.error) && <div role="alert"><p className="text-danger">{error || t('error')}</p>
      <Button variant="secondary" onClick={() => { setError(''); void resource.retry(); }}>{t('retry')}</Button></div>}
    {!resource.data && !resource.error && <LoadingState variant="detail" />}
    {resource.data?.data && (resource.data.data.length ? <ul className="divide-y divide-line-soft">{resource.data.data.map(row =>
      <li key={row.id} className="flex flex-wrap items-center gap-stack py-stack">
        <div><p>{row.name} · {t('duration', { n: row.days, count: formatNumber(row.days, locale) })}</p>
          {row.note && <p className="break-words text-sm text-muted">{row.note}</p>}</div>
        <div className="ms-auto flex gap-inline"><Button variant="secondary" disabled={busy} onClick={() => void decide(row.id, true)}>{t('approve')}</Button>
          <Button variant="secondary" disabled={busy} onClick={() => void decide(row.id, false)}>{t('decline')}</Button></div>
      </li>)}</ul> : <p className="text-muted">{t('empty')}</p>)}
  </section>;
}

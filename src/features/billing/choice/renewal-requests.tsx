'use client';
import { Button } from '@/ui/button';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { decideRenewalRequest, listRenewalRequests } from '../data/renewal-requests';
import { messages } from './messages';
export function RenewalRequests({ playerId }: { playerId?: string }) {
  const t = useT(messages), router = useRouter();
  const load = useCallback(() => listRenewalRequests(playerId), [playerId]);
  const resource = useResource(`billing:renewal-requests:${playerId ?? 'all'}`, load);
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [error, setError] = useState('');
  async function decide(id: string, status: 'approved' | 'declined') {
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await decideRenewalRequest(id, status);
      if (result.error) setError(result.error);
      else { setNotice(t(result.fallback ? 'expired' : 'saved')); await resource.retry(); router.refresh(); }
    } catch { setError(t('error')); } finally { setBusy(false); }
  }
  return <section className="glass space-y-stack rounded-card border border-line-soft p-card" aria-busy={busy}>
    <h2 className="font-display text-title font-semibold">{t('requests')}</h2>
    {notice && <p role="status" className="text-warn">{notice}</p>}
    {(error || resource.error || resource.data?.error) && <div role="alert"><p className="text-danger">{error || t('error')}</p><Button variant="secondary" type="button" className="min-h-12 px-page-x" onClick={() => void resource.retry()}>{t('retry')}</Button></div>}
    {!resource.data ? <p role="status" className="text-faint">{t('loading')}</p> : resource.data.data?.length ? <ul className="divide-y divide-line-soft">{resource.data.data.map(row =>
      <li key={row.id} className="flex flex-wrap items-center gap-stack py-stack"><span>{row.name} · {row.package}</span><div className="ms-auto flex gap-inline">
        <button type="button" disabled={busy} onClick={() => void decide(row.id, 'approved')} className="min-h-12 rounded-full border border-lime px-page-x text-lime">{t('approve')}</button>
        <Button type="button" disabled={busy} onClick={() => void decide(row.id, 'declined')} variant={'secondary'} block={false} className={"min-h-12 px-page-x"}>{t('decline')}</Button>
      </div></li>)}</ul> : !resource.data.error && <p className="text-faint">{t('noRequests')}</p>}
  </section>;
}

'use client';
import { useCallback, useState } from 'react';
import dynamic from 'next/dynamic';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { loadPlayerReceipt, submitPaymentReceipt } from '../data/receipt-actions';
import { messages } from './messages';
import type { UploadedReceipt } from './types';
const Sheet = dynamic(() => import('./upload-sheet').then(module => module.UploadSheet));
export function PlayerReceipt({ renewalId }: { renewalId: string | null }) {
  const t = useT(messages), load = useCallback(() => loadPlayerReceipt(), []);
  const resource = useResource('billing:player-receipt', load);
  const [open, setOpen] = useState(false), [error, setError] = useState('');
  async function send(upload: UploadedReceipt) {
    const data = resource.data?.data;
    if (!data) return;
    setOpen(false); setError('');
    const ok = await resource.mutate(current => ({ data: { ...data, receipt: {
      id: data.receipt?.status === 'pending' ? data.receipt.id : upload.id, player_id: data.playerId, captain_id: data.captainId,
      renewal_request_id: renewalId, amount_egp: upload.amount, method: upload.method, photo_path: upload.photo,
      revision: data.receipt?.status === 'pending' ? data.receipt.revision + 1 : 1,
      status: 'pending', decline_reason: null, created_at: current?.data?.receipt?.created_at ?? new Date().toISOString(), decided_at: null,
    } }, error: undefined }), async () => {
      const result = await submitPaymentReceipt({ ...upload, captainId: data.captainId, renewalId });
      if (result.error) throw new Error(result.error);
    });
    if (!ok) setError(t('error'));
    else await resource.retry();
  }
  if (resource.error || resource.data?.error) return <div role="alert" className="space-y-2 text-danger">{t('loadError')}
    <button className="min-h-12 rounded-control border border-line px-4" onClick={() => void resource.retry()}>{t('retry')}</button></div>;
  const data = resource.data?.data;
  if (!data) return <p role="status" className="text-muted">{t('loading')}</p>;
  const receipt = data.receipt;
  return <div className="space-y-3 border-t border-line-soft pt-4">
    {error && <p role="alert" className="text-danger">{error}</p>}
    {receipt && <p role="status" className={receipt.status === 'declined' ? 'text-warn' : 'text-muted'}>
      {receipt.status === 'declined' ? t('declined', { reason: receipt.decline_reason ?? '' }) : t(receipt.status)}</p>}
    <button type="button" onClick={() => setOpen(true)} className="glass min-h-12 rounded-control border border-line px-5">
      {t(!receipt || receipt.status === 'accepted' ? 'upload' : receipt.status === 'pending' ? 'replace' : 'resend')}</button>
    {open && <Sheet playerId={data.playerId} captainId={data.captainId} onClose={() => setOpen(false)} onSend={send} />}
  </div>;
}

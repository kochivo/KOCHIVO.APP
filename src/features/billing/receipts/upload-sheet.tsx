'use client';
import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { useT } from '@/core/i18n/client';
import { supabaseBrowser } from '@/core/supabase/browser';
import { uuidv7 } from '@/core/offline/ids';
import { compressImage } from '@/lib/compress-image';
import { KoCamera, KoSend } from '@/ui/icons';
import { messages } from './messages';
import { receiptMethods } from './types';
import type { ReceiptMethod, UploadedReceipt } from './types';
import { validReceiptImage } from './image';
import { Button } from '@/ui/button';

export function UploadSheet({ playerId, captainId, onClose, onSend }: {
  playerId: string; captainId: string; onClose: () => void; onSend: (receipt: UploadedReceipt) => Promise<void>;
}) {
  const t = useT(messages), dialog = useRef<HTMLDialogElement>(null), lock = useRef(false);
  const [file, setFile] = useState<File | null>(null), [preview, setPreview] = useState('');
  const [amount, setAmount] = useState(''), [method, setMethod] = useState<ReceiptMethod | ''>('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  useEffect(() => { const element = dialog.current; element?.showModal(); return () => element?.close(); }, []);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  async function send() {
    if (lock.current || !file) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const blob = await compressImage(file, 1600, 0.8, t, true);
      const client = supabaseBrowser(), id = uuidv7(), path = `${playerId}/${captainId}/${uuidv7()}.jpg`;
      const upload = await client.storage.from('payment-receipts').upload(path, blob, { contentType: blob.type, upsert: false });
      if (upload.error) throw upload.error;
      await onSend({ id, amount: Number(amount), method: method || null, photo: path });
    } catch { setError(t('error')); }
    finally { lock.current = false; setBusy(false); }
  }
  return <dialog ref={dialog} aria-labelledby="receipt-upload-title" onCancel={event => { event.preventDefault(); if (!busy) onClose(); }}
    className="sheet fixed inset-x-0 bottom-0 top-auto m-0 max-h-[90dvh] w-full max-w-none overflow-y-auto rounded-t-card border border-line bg-surface p-6 text-ink backdrop:bg-bg-deep/80 sm:inset-0 sm:m-auto sm:max-w-lg sm:rounded-card">
    <header className="mb-5 flex items-center justify-between gap-3"><h2 id="receipt-upload-title" className="text-xl font-bold">{t('upload')}</h2>
      <Button type="button" disabled={busy} onClick={onClose} variant={'secondary'} block={false} className={"min-h-12 px-4"}>{t('close')}</Button></header>
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); void send(); }}>
      <label className="glass flex min-h-32 cursor-pointer flex-col items-center justify-center gap-2 rounded-control border border-dashed border-line p-5 text-center">
        <KoCamera aria-hidden className="size-6" /><b>{t('photo')}</b><small className="text-muted">{t('hint')}</small>
        <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" disabled={busy} className="w-full min-w-0 text-sm" required onChange={event => {
          const next = event.target.files?.[0]; setError('');
          if (next && validReceiptImage(next)) { setFile(next); setPreview(URL.createObjectURL(next)); }
          else { setFile(null); setPreview(''); setError(t('imageIsTooLargeOrUnsupportedChoose')); event.target.value = ''; }
        }} />
      </label>
      {preview && <Image src={preview} alt={t('image')} width={400} height={300} unoptimized className="max-h-64 w-full rounded-control object-contain" />}
      <label className="block space-y-2"><span>{t('amount')}</span><input type="number" inputMode="numeric" min={1} max={100000} step={1} required disabled={busy}
        value={amount} onChange={event => setAmount(event.target.value)} className="glass min-h-12 w-full rounded-control border border-line px-3" /></label>
      <label className="block space-y-2"><span>{t('method')}</span><select disabled={busy} value={method} onChange={event => setMethod(event.target.value as ReceiptMethod | '')}
        className="min-h-12 w-full rounded-control border border-line bg-surface px-3">
        <option value="">{t('unknownMethod')}</option>{receiptMethods.map(key => <option key={key} value={key}>{t(key)}</option>)}
      </select></label>
      {error && <p role="alert" className="text-danger">{error}</p>}
      {busy && <p role="status" className="text-muted">{t('sending')}</p>}
      <Button type="submit" disabled={busy || !file} variant={'primary'} block={false} className={"flex min-h-12 w-full items-center justify-center gap-2 px-4 font-semibold disabled:opacity-50"}>
        <KoSend aria-hidden className="size-5" />{t('send')}</Button>
    </form>
  </dialog>;
}

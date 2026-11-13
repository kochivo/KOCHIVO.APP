'use client';
import { IconButton } from '@/ui/icon-button';
import { useTimezone } from '@/core/timezone/client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { localDate } from '@/lib/dates';
import { Button } from '@/ui';
import { addScan } from '../data/scans';
import { messages } from '../messages';
import { scanError } from '../errors';
import type { Scan } from '../types';

export function ScanSheet({ onClose, onSaved }: { onClose: () => void; onSaved: (scan: Scan) => void }) {
  const timezone = useTimezone();
  const t = useT(messages);
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [online, setOnline] = useState(true);
  const [today] = useState(() => localDate(new Date(), timezone));
  useEffect(() => {
    dialog.current?.showModal();
    const update = () => setOnline(navigator.onLine);
    update();
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => { window.removeEventListener('online', update); window.removeEventListener('offline', update); };
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    const data = new FormData(event.currentTarget);
    const number = (key: string) => data.get(key) === '' ? null : Number(data.get(key));
    const file = data.get('file');
    setBusy(true); setError('');
    try {
      const scan = await addScan({ scan_date: String(data.get('date')), weight_kg: number('weight_kg'),
        muscle_kg: number('muscle_kg'), fat_pct: number('fat_pct') }, file instanceof File && file.size ? file : null, new Date(), t);
      onSaved(scan);
    } catch (cause) { setError(scanError(cause, t, 'saveError')); }
    finally { setBusy(false); }
  }
  return <dialog ref={dialog} aria-labelledby="scan-sheet-title" onCancel={event => { if (busy) event.preventDefault(); else onClose(); }}
    onClose={onClose} className="sheet fixed inset-x-0 top-auto bottom-0 m-0 max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-t-card p-5 text-ink backdrop:bg-bg-deep/80 md:mx-auto">
    <header className="mb-4 flex items-center justify-between"><h2 id="scan-sheet-title" className="text-xl font-bold">{t('add')}</h2>
      <IconButton className="min-h-12 min-w-12" aria-label={t('close')} disabled={busy} onClick={onClose}><X aria-hidden /></IconButton></header>
    <form onSubmit={submit} className="space-y-4">
      <label className="block space-y-1"><span>{t('date')}</span><input name="date" type="date" required defaultValue={today} max={today}
        className="glass min-h-12 w-full rounded-control px-3" /></label>
      {([{ key: 'weight_kg', min: 20, max: 400, range: 'weightRange' },
        { key: 'muscle_kg', min: 5, max: 150, range: 'muscleRange' },
        { key: 'fat_pct', min: 3, max: 70, range: 'fatRange' }] as const).map(field =>
        <label key={field.key} className="block space-y-1"><span>{t(field.key)} <span className="text-sm text-muted">{t(field.range)}</span></span>
          <input name={field.key} type="number" step="0.1" min={field.min} max={field.max} inputMode="decimal"
            className="glass min-h-12 w-full rounded-control px-3" /></label>)}
      <label className="block space-y-1"><span>{t('file')}</span><input name="file" type="file" accept="image/jpeg,image/webp,application/pdf"
        className="min-h-12 w-full py-2" /></label>
      {!online && <p role="status" className="text-muted">{t('offline')}</p>}
      {error && <p role="alert" className="text-danger">{error}</p>}
      <Button type="submit" size="lg" className="w-full" disabled={busy || !online}>{t(busy ? 'saving' : 'save')}</Button>
    </form>
  </dialog>;
}

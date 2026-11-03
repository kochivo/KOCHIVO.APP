'use client';

import { useEffect, useRef, useState, useTransition } from 'react';
import { Button } from '@/ui/button';
import { setSuspended } from '../data/set-suspended';
import type { CaptainRow } from '../types';

export function SuspendDialog({ captain, onClose, onSuccess }: {
  captain: CaptainRow; onClose: () => void; onSuccess: (message: string) => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  useEffect(() => { ref.current?.showModal(); }, []);
  return <dialog ref={ref} aria-labelledby="suspend-title" aria-describedby="suspend-warning"
    onCancel={event => { event.preventDefault(); if (!pending) onClose(); }}
    className="m-auto max-h-[90dvh] w-[calc(100%_-_2rem)] max-w-md overflow-y-auto rounded-card border border-line bg-surface p-6 text-ink backdrop:bg-bg-deep/80">
    <h2 id="suspend-title" className="text-xl font-bold">{captain.suspended ? 'ترجيع الحساب' : 'إيقاف الحساب'}</h2>
    <p className="mt-2 break-words text-muted">{captain.full_name}</p>
    <p id="suspend-warning" className="my-4 text-warn">الكابتن الموقوف مش هيقدر يدعو لاعبين، حتى بالدعوات القديمة.</p>
    <form onSubmit={event => {
      event.preventDefault(); setError('');
      startTransition(async () => {
        try {
          const result = await setSuspended({ user_id: captain.id, suspended: !captain.suspended, reason });
          if (result.error) { setError(result.error); return; }
          onSuccess(captain.suspended ? 'الحساب رجع' : 'الحساب اتوقف');
        } catch { setError('العملية ما كملتش، جرّب تاني'); }
      });
    }}>
      <label className="block space-y-2"><span>سبب {captain.suspended ? 'الترجيع' : 'الإيقاف'}</span>
        <textarea required minLength={3} maxLength={200} value={reason} disabled={pending}
          onChange={event => setReason(event.target.value)}
          className="min-h-28 w-full rounded-control border border-line bg-bg p-3" />
      </label>
      {error && <p role="alert" className="mt-3 text-danger">{error}</p>}
      <div className="mt-5 flex gap-2">
        <Button type="submit" disabled={pending}>{pending ? 'جاري الحفظ…' : captain.suspended ? 'رجّع الحساب' : 'وقّف الحساب'}</Button>
        <Button variant="ghost" disabled={pending} onClick={onClose}>إلغاء</Button>
      </div>
    </form>
  </dialog>;
}

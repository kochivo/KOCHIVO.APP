'use client';
import { useEffect, useId, useRef, useState } from 'react';
import { useT } from '@/core/i18n/client';
import type { DeviceRole } from '@/core/pwa/device-role';
import { Button } from '@/ui/button';
import { useToast } from '@/ui/toast';
import { sendFeedback } from '../data/send-feedback';
import { messages } from '../messages';

export function FeedbackSheet({ role, onClose }: { role: DeviceRole; onClose: () => void }) {
  const t = useT(messages);
  const toast = useToast();
  const titleId = useId();
  const inputId = useId();
  const errorId = useId();
  const dialog = useRef<HTMLDialogElement>(null);
  const inFlight = useRef(false);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<'validation' | 'failed' | null>(null);
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => element?.close();
  }, []);
  return <dialog ref={dialog} aria-labelledby={titleId} aria-modal="true"
    onCancel={event => { event.preventDefault(); if (!inFlight.current) onClose(); }}
    className="sheet fixed start-4 end-4 bottom-6 top-auto z-40 m-0 mx-auto max-h-[85dvh] w-auto max-w-lg overflow-y-auto rounded-card p-6 text-start text-ink backdrop:bg-bg-deep/80">
    <h2 id={titleId} className="text-xl font-bold">{t('report')}</h2>
    <form noValidate className="mt-4 space-y-4" aria-busy={pending} onSubmit={async event => {
      event.preventDefault();
      if (inFlight.current) return;
      inFlight.current = true; setPending(true); setError(null);
      const result = await sendFeedback(message, role);
      inFlight.current = false; setPending(false);
      if (result.error) setError(result.error);
      else { toast.success(t('thanks')); onClose(); }
    }}>
      <label htmlFor={inputId} className="block font-medium">{t('problem')}</label>
      <textarea id={inputId} value={message} onChange={event => setMessage(event.target.value)} rows={5}
        minLength={5} maxLength={1000} required disabled={pending} aria-invalid={Boolean(error)}
        aria-describedby={error ? errorId : undefined}
        className="min-h-12 w-full rounded-control border border-line bg-surface p-3 text-ink" />
      {error && <p id={errorId} role="alert" className="text-sm text-danger">{t(error)}</p>}
      <div className="flex flex-wrap gap-3">
        <Button type="submit" disabled={pending}>{t(pending ? 'sending' : 'send')}</Button>
        <Button variant="ghost" disabled={pending} onClick={onClose}>{t('close')}</Button>
      </div>
    </form>
  </dialog>;
}

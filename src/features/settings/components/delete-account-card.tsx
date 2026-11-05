'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useState } from 'react';
import { Button, TextField } from '@/ui';
import { formatTimestampAr } from '@/lib/dates';
import { cancelDeletion, requestDeletion } from '../data/settings';
import { deletionDate } from '../deletion';

export function DeleteAccountCard({ requestedAt }: { requestedAt: string | null }) {
  const t = useT(messages);
  const locale = useLocale();
  const [due, setDue] = useState<string | null>(() => requestedAt ? deletionDate(requestedAt) : null);
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function submit() {
    if (!due && confirmation !== t('delete')) return;
    setPending(true); setMessage('');
    try {
      if (due) {
        const result = await cancelDeletion();
        if (result.error) setMessage(result.error);
        else { setDue(null); setConfirmation(''); setMessage(t('deletionRequestCancelled')); }
      } else {
        const result = await requestDeletion();
        if (result.error) setMessage(result.error);
        else if (result.data) { setDue(result.data); setConfirmation(''); }
      }
    } catch { setMessage(t('requestFailedTryAgain')); }
    finally { setPending(false); }
  }
  return <section className="glass space-y-4 rounded-card border border-danger p-6">
    <h2 className="text-lg font-bold text-danger">{t('deleteAccount')}</h2>
    {due ? <p role="status" className="glass-strong rounded-control p-4">
      {t('yourAccountWillBeDeletedOn')} <time dateTime={due}>{formatTimestampAr(due, {
        day: 'numeric', month: 'long', year: 'numeric',
      }, locale)}</time>{t('youCanCancelBeforeThen')}
    </p> : <>
      <p className="text-sm text-muted">{t('deletionIsPermanentAfter7Days')}</p>
      <TextField label={t('typeDELETEToConfirm')} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={pending} autoComplete="off" />
    </>}
    <Button variant="ghost" className="min-h-12 text-danger!" disabled={pending || (!due && confirmation !== t('delete'))}
      onClick={() => void submit()}>{pending ? t('processing') : due ? t('cancelDeletion') : t('deleteAccount')}</Button>
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}

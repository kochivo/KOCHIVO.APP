'use client';

import { useState } from 'react';
import { Button, TextField } from '@/ui';
import { cancelDeletion, requestDeletion } from '../data/settings';
import { deletionDate } from '../schema';

export function DeleteAccountCard({ requestedAt }: { requestedAt: string | null }) {
  const [due, setDue] = useState<string | null>(() => requestedAt ? deletionDate(requestedAt) : null);
  const [confirmation, setConfirmation] = useState('');
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function submit() {
    if (!due && confirmation !== 'امسح') return;
    setPending(true); setMessage('');
    try {
      if (due) {
        const result = await cancelDeletion();
        if (result.error) setMessage(result.error);
        else { setDue(null); setConfirmation(''); setMessage('طلب المسح اتلغى'); }
      } else {
        const result = await requestDeletion();
        if (result.error) setMessage(result.error);
        else if (result.data) { setDue(result.data); setConfirmation(''); }
      }
    } catch { setMessage('الطلب متعملش. جرّب تاني'); }
    finally { setPending(false); }
  }
  return <section className="glass space-y-4 rounded-card border border-danger p-6">
    <h2 className="text-lg font-bold text-danger">امسح الحساب</h2>
    {due ? <p role="status" className="glass-strong rounded-control p-4">
      حسابك هيتمسح يوم <time dateTime={due}>{new Intl.DateTimeFormat('ar-EG', {
        timeZone: 'Africa/Cairo', day: 'numeric', month: 'long', year: 'numeric',
      }).format(new Date(due))}</time>. تقدر تلغي قبلها
    </p> : <>
      <p className="text-sm text-muted">المسح نهائي بعد ٧ أيام. تقدر تلغي الطلب قبلها.</p>
      <TextField label="اكتب امسح عشان تأكد" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} disabled={pending} autoComplete="off" />
    </>}
    <Button variant="ghost" className="min-h-12 text-danger!" disabled={pending || (!due && confirmation !== 'امسح')}
      onClick={() => void submit()}>{pending ? 'بننفّذ الطلب...' : due ? 'الغي طلب المسح' : 'امسح الحساب'}</Button>
    <p role="status" aria-live="polite">{message}</p>
  </section>;
}

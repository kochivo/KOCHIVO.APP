'use client';

import { useId, useState } from 'react';
import { Button } from '@/ui';
import { saveInviteMessage } from '../data/settings';

export function InviteMessageForm({ initialMessage }: { initialMessage: string | null }) {
  const id = useId();
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  return <form className="glass space-y-4 rounded-card p-6" onSubmit={async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true); setMessage('');
    try {
      const result = await saveInviteMessage({ invite_message: form.get('invite_message') });
      setMessage(result.error ?? 'اتحفظ');
    } catch { setMessage('الحفظ متعملش. جرّب تاني'); }
    finally { setPending(false); }
  }}>
    <h2 className="text-lg font-bold">رسالة الدعوة</h2>
    <label htmlFor={id} className="block text-sm text-muted">اكتب رسالة الدعوة الافتراضية، لحد ٥٠٠ حرف</label>
    <textarea id={id} name="invite_message" maxLength={500} defaultValue={initialMessage ?? ''} disabled={pending}
      className="min-h-32 w-full rounded-control border border-line bg-surface p-4 text-start text-ink" />
    <Button type="submit" className="min-h-12" disabled={pending}>{pending ? 'بنحفظ...' : 'احفظ'}</Button>
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}

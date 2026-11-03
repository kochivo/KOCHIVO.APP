'use client';

import { useState } from 'react';
import { Button, TextField } from '@/ui';
import { saveProfile } from '../data/settings';
import type { SettingsProfile } from '../schema';

export function ProfileForm({ profile }: { profile: SettingsProfile }) {
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  return <form className="glass space-y-4 rounded-card p-6" onSubmit={async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true); setMessage('');
    try {
      const result = await saveProfile({ full_name: form.get('full_name'), phone: form.get('phone') });
      setMessage(result.error ?? 'اتحفظ');
    } catch { setMessage('الحفظ متعملش. جرّب تاني'); }
    finally { setPending(false); }
  }}>
    <h2 className="text-lg font-bold">البروفايل</h2>
    <TextField label="الاسم بالكامل" name="full_name" autoComplete="name" defaultValue={profile.full_name} required minLength={1} maxLength={80} disabled={pending} />
    <TextField label="رقم الواتساب" name="phone" type="tel" dir="ltr" autoComplete="tel" defaultValue={profile.phone ?? ''}
      hint="بالصيغة الدولية زي +201012345678" required pattern="\+[1-9][0-9]{7,14}" maxLength={16} disabled={pending} />
    <Button type="submit" className="min-h-12" disabled={pending}>{pending ? 'بنحفظ...' : 'احفظ'}</Button>
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}

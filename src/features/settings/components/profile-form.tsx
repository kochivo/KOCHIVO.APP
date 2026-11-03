'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useState } from 'react';
import { Button, TextField } from '@/ui';
import { saveProfile } from '../data/settings';
import type { SettingsProfile } from '../schema';

export function ProfileForm({ profile }: { profile: SettingsProfile }) {
  const t = useT(messages);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  return <form className="glass space-y-4 rounded-card p-6" onSubmit={async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    setPending(true); setMessage('');
    try {
      const result = await saveProfile({ full_name: form.get('full_name'), phone: form.get('phone') });
      setMessage(result.error ?? t('saved'));
    } catch { setMessage(t('saveFailedTryAgain')); }
    finally { setPending(false); }
  }}>
    <h2 className="text-lg font-bold">{t('profile')}</h2>
    <TextField label={t('fullName')} name="full_name" autoComplete="name" defaultValue={profile.full_name} required minLength={1} maxLength={80} disabled={pending} />
    <TextField label={t('whatsappNumber')} name="phone" type="tel" dir="ltr" autoComplete="tel" defaultValue={profile.phone ?? ''}
      hint={t('internationalFormatLike201012345678')} required pattern="\+[1-9][0-9]{7,14}" maxLength={16} disabled={pending} />
    <Button type="submit" className="min-h-12" disabled={pending}>{pending ? t('saving') : t('save')}</Button>
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}

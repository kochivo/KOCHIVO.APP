'use client';
import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { Button, TextField } from '@/ui';
import { TIMEZONE_CHANGED } from '@/core/timezone/timezone-provider';
import { DEFAULT_TIMEZONE } from '@/lib/dates';
import { internationalEnabled } from '@/lib/international-enabled';
import { savePlayerWithAvatar } from '../data/captain-avatar';
import type { SettingsProfile } from '../schema';
import { messages } from '../messages';
import { TimezoneFields } from './timezone-fields';
import { useProfileWrite } from '../hooks/use-profile-write';

export function PlayerProfileEditor({ profile, onSave }: { profile: SettingsProfile; onSave: (profile: SettingsProfile) => void }) {
  const t = useT(messages);
  const [name, setName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [zone, setZone] = useState({ timezone: profile.timezone ?? DEFAULT_TIMEZONE, timezone_auto: profile.timezone_auto ?? true });
  const writer = useProfileWrite();
  const pending = writer.pending;
  const [message, setMessage] = useState('');
  return <form className="space-y-4 px-4 pb-4" onSubmit={async event => {
    event.preventDefault();
    await writer.run(async () => {
      setMessage('');
      try {
        const result = await savePlayerWithAvatar({ full_name: name, phone, avatar_path: profile.avatar_path,
          ...(internationalEnabled() ? zone : {}) }, null, t);
        if (result.data) {
          onSave(result.data); setName(result.data.full_name); setPhone(result.data.phone ?? '');
          if (internationalEnabled()) window.dispatchEvent(new CustomEvent(TIMEZONE_CHANGED, { detail: result.data }));
        }
        setMessage(result.error ?? t('saved'));
      } catch { setMessage(t('saveFailedTryAgain')); }
    });
  }}>
    <TextField label={t('fullName')} name="full_name" autoComplete="name" value={name} onChange={event => setName(event.target.value)} required minLength={1} maxLength={80} disabled={pending} />
    <TextField label={t('whatsappNumber')} name="phone" type="tel" dir="ltr" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)}
      hint={t('optionalWhatsapp')} pattern="\+[1-9][0-9]{7,14}" maxLength={16} disabled={pending} />
    {internationalEnabled() && <fieldset disabled={pending}><TimezoneFields timezone={zone.timezone} auto={zone.timezone_auto}
      onChange={(timezone, timezone_auto) => setZone({ timezone, timezone_auto })} /></fieldset>}
    <Button variant="secondary" type="submit" className="min-h-12 rounded-full" disabled={pending}>{t(pending ? 'saving' : 'save')}</Button>
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}

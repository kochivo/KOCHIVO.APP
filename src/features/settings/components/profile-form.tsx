'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useRef, useState } from 'react';
import { Button, TextField } from '@/ui';
import { savePlayerWithAvatar } from '../data/captain-avatar';
import { AvatarPicker } from './avatar-picker';
import type { SettingsProfile } from '../schema';
import { TimezoneFields } from './timezone-fields';
import { DEFAULT_TIMEZONE } from '@/lib/dates';
import { internationalEnabled } from '@/lib/international-enabled';
import { TIMEZONE_CHANGED } from '@/core/timezone/timezone-provider';

export function ProfileForm({ profile }: { profile: SettingsProfile }) {
  const t = useT(messages);
  const [message, setMessage] = useState('');
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(profile);
  const [name, setName] = useState(profile.full_name);
  const [phone, setPhone] = useState(profile.phone ?? '');
  const [zone, setZone] = useState({ timezone: profile.timezone ?? DEFAULT_TIMEZONE, timezone_auto: profile.timezone_auto ?? true });
  const [file, setFile] = useState<File | null>(null);
  const inFlight = useRef(false);
  return <form className="glass space-y-card-gap rounded-card p-section" onSubmit={async (event) => {
    event.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    setPending(true); setMessage('');
    try {
      const result = await savePlayerWithAvatar({ full_name: name, phone, avatar_path: saved.avatar_path,
        ...(internationalEnabled() ? zone : {}) }, file, t);
      if (result.data && internationalEnabled()) window.dispatchEvent(new CustomEvent(TIMEZONE_CHANGED, { detail: result.data }));
      if (result.data) { setSaved(result.data); setName(result.data.full_name); setPhone(result.data.phone ?? ''); setFile(null); }
      setMessage(result.error ?? t('saved'));
    } catch { setMessage(t('saveFailedTryAgain')); }
    finally { inFlight.current = false; setPending(false); }
  }}>
    <h2 className="text-lg font-bold">{t('myProfile')}</h2>
    <AvatarPicker name={name} path={saved.avatar_path} file={file} pending={pending} onChange={setFile} />
    <TextField label={t('fullName')} name="full_name" autoComplete="name" value={name} onChange={event => setName(event.target.value)} required minLength={1} maxLength={80} disabled={pending} />
    <TextField label={t('whatsappNumber')} name="phone" type="tel" dir="ltr" autoComplete="tel" value={phone} onChange={event => setPhone(event.target.value)}
      hint={t('optionalWhatsapp')} required={profile.role === 'captain'} pattern="\+[1-9][0-9]{7,14}" maxLength={16} disabled={pending} />
    {internationalEnabled() && <fieldset disabled={pending}><TimezoneFields timezone={zone.timezone} auto={zone.timezone_auto}
      onChange={(timezone, timezone_auto) => setZone({ timezone, timezone_auto })} /></fieldset>}
    <Button type="submit" className="min-h-12" disabled={pending}>{pending ? t('saving') : t('save')}</Button>
    <p role="status" aria-live="polite">{message}</p>
  </form>;
}

'use client';
import { useEffect, useRef, useState } from 'react';
import { Camera } from 'lucide-react';
import Image from 'next/image';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui';
import { useToast } from '@/ui/toast';
import { messages } from '../messages';
import { settingsSchemas } from '../schema';
import type { CaptainProfileInput, SettingsProfile } from '../schema';
import { captainAvatarUrl, saveCaptainWithAvatar } from '../data/captain-avatar';
import { CaptainProfileFields } from './captain-profile-fields';
import { SocialLinksFields } from './social-links-fields';

function values(profile: SettingsProfile): CaptainProfileInput {
  return { full_name: profile.full_name, bio: profile.bio ?? '', location: profile.location ?? '',
    timezone: profile.timezone ?? 'Africa/Cairo', units: profile.units ?? 'metric',
    social: profile.social ?? {}, avatar_path: profile.avatar_path ?? null };
}

export function CaptainProfileCard({ profile, onSave }: { profile: SettingsProfile; onSave: (profile: SettingsProfile) => void }) {
  const t = useT(messages), toast = useToast();
  const [saved, setSaved] = useState(profile);
  const [value, setValue] = useState(() => values(profile));
  const [file, setFile] = useState<File | null>(null);
  const [avatar, setAvatar] = useState('');
  const [preview, setPreview] = useState('');
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const upload = useRef<HTMLInputElement>(null);
  const inFlight = useRef(false);
  useEffect(() => {
    let active = true;
    void (saved.avatar_path ? captainAvatarUrl(saved.avatar_path) : Promise.resolve(''))
      .then(url => { if (active) setAvatar(url); }).catch(() => { if (active) setAvatar(''); });
    return () => { active = false; };
  }, [saved.avatar_path]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  return <form noValidate className="glass-strong mx-auto max-w-2xl space-y-6 rounded-card p-4 md:p-8" onSubmit={async event => {
    event.preventDefault();
    if (inFlight.current) return;
    const parsed = settingsSchemas(t).captainProfileSchema.safeParse(value);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join('.'), issue.message]))); return;
    }
    inFlight.current = true; setPending(true); setErrors({});
    onSave({ ...saved, ...parsed.data });
    try {
      const result = await saveCaptainWithAvatar(parsed.data, file, t);
      if (!result.data) throw new Error(result.error);
      setSaved(result.data); setValue(values(result.data)); setFile(null); setPreview(''); onSave(result.data);
      if (upload.current) upload.current.value = '';
      toast.success(t('saved'));
    } catch {
      onSave(saved); setValue(values(saved)); setFile(null); setPreview('');
      if (upload.current) upload.current.value = '';
      toast.error(t('rolledBack'));
    } finally { inFlight.current = false; setPending(false); }
  }}>
    <header className="flex items-center gap-4">
      <div className="relative shrink-0">
        {(preview || avatar) ? <Image src={preview || avatar} alt="" width={64} height={64} unoptimized className="size-16 rounded-full object-cover" /> :
          <span aria-hidden className="glass flex size-16 items-center justify-center rounded-full text-2xl font-bold">{value.full_name.slice(0, 1)}</span>}
        <button type="button" disabled={pending} aria-label={t('uploadAvatar')} onClick={() => upload.current?.click()}
          className="glass absolute -end-4 -bottom-3 flex min-h-12 min-w-12 items-center justify-center rounded-full">
          <Camera aria-hidden className="size-5" />
        </button>
        <input ref={upload} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" aria-label={t('uploadAvatar')}
          onChange={event => {
            const selected = event.target.files?.[0] ?? null;
            setFile(selected); setPreview(selected ? URL.createObjectURL(selected) : '');
          }} />
      </div>
      <div><h2 className="text-xl font-bold">{t('branding')}</h2><p className="text-sm text-muted">{t('brandingHint')}</p></div>
    </header>
    <fieldset disabled={pending} className="space-y-6">
      <CaptainProfileFields value={value} errors={errors} onChange={setValue} />
      <SocialLinksFields value={value.social} errors={errors} onChange={(key, link) => setValue({ ...value, social: { ...value.social, [key]: link } })} />
    </fieldset>
    <footer className="flex flex-col gap-3 sm:flex-row">
      <Button type="submit" disabled={pending}>{pending ? t('saving') : t('saveChanges')}</Button>
      <Button type="button" variant="ghost" disabled={pending} onClick={() => {
        setValue(values(saved)); setFile(null); setPreview(''); setErrors({}); if (upload.current) upload.current.value = '';
      }}>{t('cancel')}</Button>
    </footer>
  </form>;
}

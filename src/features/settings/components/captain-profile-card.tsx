'use client';
import { useRef, useState } from 'react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui';
import { useToast } from '@/ui/toast';
import { messages } from '../messages';
import { settingsSchemas } from '../schema';
import type { CaptainProfileInput, SettingsProfile } from '../schema';
import { saveCaptainWithAvatar } from '../data/captain-avatar';
import { AvatarPicker } from './avatar-picker';
import { CaptainProfileFields } from './captain-profile-fields';
import { SocialLinksFields } from './social-links-fields';

function values(profile: SettingsProfile): CaptainProfileInput {
  return { full_name: profile.full_name, bio: profile.bio ?? '', location: profile.location ?? '',
    public_slug: profile.public_slug ?? '',
    timezone: profile.timezone ?? 'Africa/Cairo', units: profile.units ?? 'metric',
    social: profile.social ?? {}, avatar_path: profile.avatar_path ?? null };
}

export function CaptainProfileCard({ profile, onSave }: { profile: SettingsProfile; onSave: (profile: SettingsProfile) => void }) {
  const t = useT(messages), toast = useToast();
  const [saved, setSaved] = useState(profile);
  const [value, setValue] = useState(() => values(profile));
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const inFlight = useRef(false);
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
      setSaved(result.data); setValue(values(result.data)); setFile(null); onSave(result.data);
      toast.success(t('saved'));
    } catch {
      onSave(saved); setValue(values(saved)); setFile(null);
      toast.error(t('rolledBack'));
    } finally { inFlight.current = false; setPending(false); }
  }}>
    <header className="flex items-center gap-4">
      <AvatarPicker name={value.full_name} path={saved.avatar_path} file={file} pending={pending} onChange={setFile} />
      <div><h2 className="text-xl font-bold">{t('branding')}</h2><p className="text-sm text-muted">{t('brandingHint')}</p></div>
    </header>
    <fieldset disabled={pending} className="space-y-6">
      <CaptainProfileFields value={value} errors={errors} onChange={setValue} />
      <SocialLinksFields value={value.social} errors={errors} onChange={(key, link) => setValue({ ...value, social: { ...value.social, [key]: link } })} />
    </fieldset>
    <footer className="flex flex-col gap-3 sm:flex-row">
      <Button type="submit" disabled={pending}>{pending ? t('saving') : t('saveChanges')}</Button>
      <Button type="button" variant="ghost" disabled={pending} onClick={() => {
        setValue(values(saved)); setFile(null); setErrors({});
      }}>{t('cancel')}</Button>
    </footer>
  </form>;
}

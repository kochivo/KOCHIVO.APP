'use client';
import { useRef, useState } from 'react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui';
import { useToast } from '@/ui/toast';
import { messages } from '../messages';
import { settingsSchemas } from '../schema';
import type { SettingsProfile } from '../schema';
import { saveCaptainWithAvatar } from '../data/captain-avatar';
import { AvatarPicker } from './avatar-picker';
import { CaptainProfileFields } from './captain-profile-fields';
import { WorkspaceFact } from './workspace-fact';
import { SocialLinksFields } from './social-links-fields';
import { internationalEnabled } from '@/lib/international-enabled';
import { TIMEZONE_CHANGED } from '@/core/timezone/timezone-provider';
import { SaveBar } from './captain/save-bar';
import { messages as sectionMessages } from '../captain-sections/messages';
import { captainProfileValues as values } from './captain/profile-values';

export function CaptainProfileCard({ profile, onSave, quiet = false, workspace = false }: {
  profile: SettingsProfile; onSave: (profile: SettingsProfile) => void; quiet?: boolean; workspace?: boolean;
}) {
  const t = useT(messages), toast = useToast();
  const sectionT = useT(sectionMessages);
  const [saved, setSaved] = useState(profile);
  const [value, setValue] = useState(() => values(profile));
  const [file, setFile] = useState<File | null>(null);
  const [pending, setPending] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState('');
  const inFlight = useRef(false);
  const dirty = file !== null || JSON.stringify(value) !== JSON.stringify(values(saved));
  function reset() {
    setValue(values(saved)); setFile(null); setErrors({}); setStatus('');
  }
  return <form noValidate className={workspace ? 'space-y-card-gap' : 'glass-strong mx-auto max-w-2xl space-y-section rounded-card p-card md:p-section'} onSubmit={async event => {
    event.preventDefault();
    if (inFlight.current || (workspace && !dirty)) return;
    const parsed = settingsSchemas(t).captainProfileSchema.safeParse(value);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map(issue => [issue.path.join('.'), issue.message]))); return;
    }
    inFlight.current = true; setPending(true); setErrors({}); setStatus('');
    onSave({ ...saved, ...parsed.data });
    try {
      const result = await saveCaptainWithAvatar(parsed.data, file, t);
      if (result.fieldErrors) {
        // Restore the saved summary while keeping the form draft and selected photo for correction.
        onSave(saved); setErrors(result.fieldErrors); return;
      }
      if (!result.data) throw new Error(result.error);
      setSaved(result.data); setValue(values(result.data)); setFile(null); onSave(result.data);
      if (internationalEnabled()) window.dispatchEvent(new CustomEvent(TIMEZONE_CHANGED, { detail: result.data }));
      if (quiet) setStatus(t('saved')); else toast.success(t('saved'));
    } catch {
      onSave(saved);
      if (quiet || workspace) setStatus(t('rolledBack'));
      else { setValue(values(saved)); setFile(null); toast.error(t('rolledBack')); }
    } finally { inFlight.current = false; setPending(false); }
  }}>
    <header className="flex items-center gap-card-gap">
      <AvatarPicker name={value.full_name} path={workspace ? value.avatar_path : saved.avatar_path} file={file} pending={pending} onChange={setFile} />
      {workspace ? (file || value.avatar_path) && <Button type="button" variant="secondary" disabled={pending}
        onClick={() => { setFile(null); setValue({ ...value, avatar_path: null }); }}>{sectionT('removePhoto')}</Button> :
        <div><h2 className="text-xl font-bold">{t('branding')}</h2><p className="text-sm text-muted">{t('brandingHint')}</p></div>}
    </header>
    <fieldset disabled={pending} className="space-y-section">
      <CaptainProfileFields value={value} errors={errors} onChange={setValue} workspace={workspace} />
      {workspace && saved.phone && !value.social.whatsapp && <WorkspaceFact label={t('whatsapp')}><bdi>{saved.phone}</bdi></WorkspaceFact>}
      <SocialLinksFields value={value.social} errors={errors} onChange={(key, link) => setValue({ ...value, social: { ...value.social, [key]: link } })} />
    </fieldset>
    {workspace ? <SaveBar dirty={dirty} pending={pending} onReset={reset} /> : <footer className="flex flex-col gap-stack sm:flex-row">
      <Button type="submit" disabled={pending}>{pending ? t('saving') : t('saveChanges')}</Button>
      <Button type="button" variant="secondary" disabled={pending} onClick={() => {
        setValue(values(saved)); setFile(null); setErrors({});
      }}>{t('cancel')}</Button>
    </footer>}
    {workspace && status && <p role="alert" className="text-sm text-danger">{status}</p>}
    {quiet && <p role="status" aria-live="polite">{pending ? t('saving') : status}</p>}
  </form>;
}

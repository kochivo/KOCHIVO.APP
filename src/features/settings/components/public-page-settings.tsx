'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { Minus, Plus } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button, clickableClass } from '@/ui/button';
import { SwitchTrack } from '@/ui/switch-track';
import { TextField } from '@/ui/text-field';
import { useToast } from '@/ui/toast';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { savePublicPage } from '../data/public-page';
import { messages } from '../public-page/messages';
import { publicPageSchema } from '../public-page-schema';
import type { PublicPageInput } from '../public-page-schema';
import { settingsSchemas } from '../schema';
import type { SettingsProfile } from '../schema';
import { messages as profileMessages } from '../messages';
import { saveCaptainWithAvatar } from '../data/captain-avatar';
import { PublicSpecialtyEditor } from './public-specialty-editor';
import { SaveBar } from './captain/save-bar';
import { WorkspacePageCard } from './workspace-page-card';
import { captainProfileValues } from './captain/profile-values';

function fields(profile: SettingsProfile): PublicPageInput {
  return { specialties: profile.specialties ?? [], years_experience: profile.years_experience ?? null,
    languages: (['ar', 'en'] as const).filter(language => profile.languages?.includes(language)),
    show_public_stats: profile.show_public_stats ?? false };
}
export function PublicPageSettings({ profile, onSave }: { profile: SettingsProfile; onSave: (profile: SettingsProfile) => void }) {
  const t = useT(messages), [value, setValue] = useState(() => fields(profile));
  const [saved, setSaved] = useState(() => fields(profile));
  const [editorVersion, setEditorVersion] = useState(0);
  const profileT = useT(profileMessages), toast = useToast();
  const [savedBio, setSavedBio] = useState(profile.bio ?? '');
  const [bio, setBio] = useState(savedBio);
  const [savedSlug, setSavedSlug] = useState(profile.public_slug ?? '');
  const [slug, setSlug] = useState(savedSlug);
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false), [status, setStatus] = useState<'saved' | 'rollback' | 'invalid' | null>(null);
  const inFlight = useRef(false);
  if (!captainWorkspaceEnabled()) return null;
  const pageDirty = JSON.stringify(value) !== JSON.stringify(saved);
  const profileDirty = bio !== savedBio || slug !== savedSlug;
  const dirty = pageDirty || profileDirty;
  function stepYears(step: number) {
    setValue({ ...value, years_experience: Math.max(0, Math.min(60, (value.years_experience ?? 0) + step)) });
  }
  return <form className="space-y-card-gap" noValidate onSubmit={async event => {
    event.preventDefault();
    if (inFlight.current || !dirty) return;
    const parsed = publicPageSchema.safeParse(value);
    if (!parsed.success) { setStatus('invalid'); return; }
    const next = parsed.data;
    const profileDraft = profileDirty ? settingsSchemas(profileT).captainProfileSchema.safeParse({
      ...captainProfileValues(profile), bio, public_slug: slug,
    }) : null;
    setProfileErrors({});
    if (profileDraft && !profileDraft.success) {
      setProfileErrors(Object.fromEntries(profileDraft.error.issues.map(issue => [issue.path.join('.'), issue.message])));
      setStatus(null);
      return;
    }
    let current = profile;
    inFlight.current = true; setPending(true); setStatus(null);
    try {
      if (profileDraft?.success) {
        onSave({ ...current, bio: profileDraft.data.bio, public_slug: profileDraft.data.public_slug });
        const result = await saveCaptainWithAvatar(profileDraft.data, null, profileT);
        if (result.fieldErrors) { onSave(current); setProfileErrors(result.fieldErrors); return; }
        if (!result.data) throw new Error('save failed');
        current = result.data;
        setSavedBio(current.bio ?? ''); setBio(current.bio ?? ''); onSave(current);
        setSavedSlug(current.public_slug ?? ''); setSlug(current.public_slug ?? '');
      }
      if (pageDirty) {
        onSave({ ...current, ...next });
        const result = await savePublicPage(next);
        if (!result.ok) throw new Error('save failed');
      }
      setSaved(next); setValue(next); setStatus('saved');
      toast.success(t('saved'));
    } catch { onSave(current); setValue(saved); setStatus('rollback'); }
    finally { inFlight.current = false; setPending(false); }
  }}>
    <WorkspacePageCard slug={savedSlug} />
    <fieldset disabled={pending} className="space-y-card-gap">
      <label className="grid gap-inline text-sm font-semibold">{profileT('bio')}
        <textarea className="min-h-16 w-full rounded-control border border-line bg-surface p-stack text-start"
          maxLength={280} rows={2} value={bio} placeholder={profileT('bioPlaceholder')}
          aria-invalid={Boolean(profileErrors.bio)} onChange={event => setBio(event.target.value)} />
      </label>
      {profileErrors.bio && <p role="alert" className="text-sm text-danger">{profileErrors.bio}</p>}
      <TextField label={profileT('publicSlug')} value={slug} maxLength={30} dir="ltr" error={profileErrors.public_slug}
        onChange={event => setSlug(event.target.value)} />
      {Object.entries(profileErrors).filter(([field]) => field !== 'bio' && field !== 'public_slug').map(([field, error]) =>
        <p key={field} role="alert" className="text-sm text-danger">{error}</p>)}
      <PublicSpecialtyEditor key={editorVersion} items={value.specialties} onChange={specialties => setValue({ ...value, specialties })} />
      <div className="grid items-end gap-card-gap sm:grid-cols-2">
      <div className="flex items-end gap-inline">
        <Button className="min-w-12" variant="secondary" aria-label={t('lessExperience')}
          disabled={(value.years_experience ?? 0) <= 0} onClick={() => stepYears(-1)}><Minus aria-hidden className="size-4" /></Button>
        <TextField label={t('years')} type="number" min={0} max={60} step={1} value={value.years_experience ?? ''}
          onChange={event => setValue({ ...value, years_experience: event.target.value === '' ? null : Number(event.target.value) })} />
        <Button className="min-w-12" variant="secondary" aria-label={t('moreExperience')}
          disabled={(value.years_experience ?? 0) >= 60} onClick={() => stepYears(1)}><Plus aria-hidden className="size-4" /></Button>
      </div>
      <fieldset><legend className="mb-inline text-sm font-semibold">{t('languages')}</legend><div className="flex flex-wrap gap-inline">{(['ar', 'en'] as const).map(language =>
        <Button key={language} type="button" variant="secondary" aria-pressed={value.languages.includes(language)}
          className="aria-pressed:border-lime aria-pressed:bg-lime-soft aria-pressed:text-lime"
          onClick={() => setValue({ ...value, languages: value.languages.includes(language)
            ? value.languages.filter(item => item !== language) : (['ar', 'en'] as const).filter(item => item === language || value.languages.includes(item)) })}>{t(language)}</Button>)}</div></fieldset>
      </div>
      <button type="button" role="switch" aria-checked={value.show_public_stats} aria-label={t('stats')}
        className={`${clickableClass} flex min-h-12 w-full items-center justify-between gap-stack rounded-control bg-bg-deep p-stack text-start`}
        onClick={() => setValue({ ...value, show_public_stats: !value.show_public_stats })}>
        <span><strong className="block text-sm">{t('stats')}</strong><span className="block text-xs text-muted">{t('minimum')}</span></span>
        <SwitchTrack on={value.show_public_stats} />
      </button>
    </fieldset>
    <div className="flex flex-wrap gap-section">
      <Link href="/captain/billing/packages" className="inline-flex min-h-12 items-center text-lime">{t('packages')}</Link>
    </div>
    <p role={status === 'rollback' || status === 'invalid' ? 'alert' : 'status'} aria-live="polite">{pending ? t('saving') : status ? t(status) : ''}</p>
    <SaveBar dirty={dirty} pending={pending} onReset={() => {
      setValue(saved); setBio(savedBio); setSlug(savedSlug); setProfileErrors({}); setStatus(null); setEditorVersion(editorVersion + 1);
    }} />
  </form>;
}

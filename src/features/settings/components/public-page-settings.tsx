'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { TextField } from '@/ui/text-field';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { savePublicPage } from '../data/public-page';
import { messages } from '../public-page/messages';
import { publicPageSchema } from '../public-page-schema';
import type { PublicPageInput } from '../public-page-schema';
import type { SettingsProfile } from '../schema';
import { PublicSpecialtyEditor } from './public-specialty-editor';

function fields(profile: SettingsProfile): PublicPageInput {
  return { specialties: profile.specialties ?? [], years_experience: profile.years_experience ?? null,
    languages: profile.languages ?? [], show_public_stats: profile.show_public_stats ?? false };
}
export function PublicPageSettings({ profile, onSave }: { profile: SettingsProfile; onSave: (profile: SettingsProfile) => void }) {
  const t = useT(messages), [value, setValue] = useState(() => fields(profile));
  const [pending, setPending] = useState(false), [status, setStatus] = useState<'saved' | 'rollback' | 'invalid' | null>(null);
  const inFlight = useRef(false);
  if (!captainWorkspaceEnabled()) return null;
  return <form className="glass space-y-section rounded-card p-section" noValidate onSubmit={async event => {
    event.preventDefault();
    if (inFlight.current) return;
    const parsed = publicPageSchema.safeParse(value);
    if (!parsed.success) { setStatus('invalid'); return; }
    const previous = fields(profile), next = parsed.data;
    inFlight.current = true; setPending(true); setStatus(null); onSave({ ...profile, ...next });
    try {
      const result = await savePublicPage(next);
      if (!result.ok) throw new Error('save failed');
      setValue(next); setStatus('saved');
    } catch { onSave({ ...profile, ...previous }); setValue(previous); setStatus('rollback'); }
    finally { inFlight.current = false; setPending(false); }
  }}>
    <h2 className="font-display text-xl font-semibold">{t('title')}</h2>
    <fieldset disabled={pending} className="space-y-section">
      <PublicSpecialtyEditor items={value.specialties} onChange={specialties => setValue({ ...value, specialties })} />
      <TextField label={t('years')} type="number" min={0} max={60} step={1} value={value.years_experience ?? ''}
        onChange={event => setValue({ ...value, years_experience: event.target.value === '' ? null : Number(event.target.value) })} />
      <fieldset><legend className="mb-inline">{t('languages')}</legend><div className="flex gap-section">{(['ar', 'en'] as const).map(language =>
        <label key={language} className="flex min-h-12 items-center gap-stack"><input type="checkbox" checked={value.languages.includes(language)}
          onChange={event => setValue({ ...value, languages: event.target.checked ? [...value.languages, language] : value.languages.filter(item => item !== language) })} />{t(language)}</label>)}</div></fieldset>
      <label className="flex min-h-12 items-center gap-stack"><input type="checkbox" role="switch" checked={value.show_public_stats}
        onChange={event => setValue({ ...value, show_public_stats: event.target.checked })} />{t('stats')}</label>
      <p className="text-sm text-muted">{t('minimum')}</p>
      <Button type="submit" variant="secondary" disabled={pending}>{t(pending ? 'saving' : 'save')}</Button>
    </fieldset>
    <div className="flex flex-wrap gap-section">
      <Link href="/captain/billing/packages" className="inline-flex min-h-12 items-center text-lime">{t('packages')}</Link>
      {profile.public_slug ? <Link href={`/c/${profile.public_slug}`} target="_blank" className="inline-flex min-h-12 items-center text-lime">{t('preview')}</Link>
        : <p className="text-sm text-muted">{t('noSlug')}</p>}
    </div>
    <p role={status === 'rollback' || status === 'invalid' ? 'alert' : 'status'} aria-live="polite">{pending ? t('saving') : status ? t(status) : ''}</p>
  </form>;
}

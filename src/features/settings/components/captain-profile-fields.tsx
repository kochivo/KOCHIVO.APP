'use client';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { editableFieldClass } from '@/ui/edit-in-place';
import { useT } from '@/core/i18n/client';
import { Segmented, TextField } from '@/ui';
import { messages } from '../messages';
import { timezones } from '../schema';
import type { CaptainProfileInput } from '../schema';
import { PublicSlugField } from './public-slug-field';
import { internationalEnabled } from '@/lib/international-enabled';
import { TimezoneFields } from './timezone-fields';
import { messages as genderMessages } from '../gender/messages';

export function CaptainProfileFields({ value, errors, onChange, workspace = false }: { value: CaptainProfileInput;
  errors: Record<string, string>; onChange: (value: CaptainProfileInput) => void; workspace?: boolean }) {
  const t = useT(messages);
  const genderT = useT(genderMessages);
  const fieldClass = 'min-h-12 w-full rounded-control border border-line bg-surface px-page-x py-stack text-start focus-visible:ring-2 focus-visible:ring-lime';
  return <div className={workspace ? 'grid gap-card-gap sm:grid-cols-2' : 'space-y-card-gap'}>
    <label className="grid gap-inline text-sm">{genderT('me')}<select className={`${fieldClass} press cursor-pointer`} value={value.coach_gender ?? ''}
      onChange={event => onChange({ ...value, coach_gender: event.target.value === 'female' ? 'female' : event.target.value === 'male' ? 'male' : null })}>
      <option value="">{genderT('optional')}</option><option value="male">{genderT('male')}</option><option value="female">{genderT('female')}</option>
    </select></label>
    {!workspace && <PublicSlugField value={value.public_slug ?? ''} error={errors.public_slug} onChange={public_slug => onChange({ ...value, public_slug })} />}
    <TextField label={t('fullName')} value={value.full_name} autoComplete="name" maxLength={80}
      onChange={e => onChange({ ...value, full_name: e.target.value })} error={errors.full_name} className="bg-surface" />
    {!workspace && <div className="space-y-inline">
      <label htmlFor="captain-bio" className="text-sm font-semibold">{t('bio')}</label>
      <textarea id="captain-bio" value={value.bio} maxLength={280} rows={3} placeholder={t('bioPlaceholder')}
        onChange={e => onChange({ ...value, bio: e.target.value })} className={captainWorkspaceEnabled() ? `${editableFieldClass} ${fieldClass}` : fieldClass}
        aria-invalid={!!errors.bio} aria-describedby={errors.bio ? 'bio-error' : undefined} />
      {errors.bio && <p id="bio-error" role="alert" className="text-sm text-danger">{errors.bio}</p>}
    </div>}
    <TextField label={t('location')} value={value.location} maxLength={80} placeholder={t('locationPlaceholder')}
      onChange={e => onChange({ ...value, location: e.target.value })} error={errors.location} className="bg-surface" />
    {internationalEnabled() ? <TimezoneFields timezone={value.timezone} auto={value.timezone_auto ?? true}
      onChange={(timezone, timezone_auto) => onChange({ ...value, timezone, timezone_auto })} /> : <div className="space-y-inline">
      <label htmlFor="captain-timezone" className="text-sm font-semibold">{t('timezone')}</label>
      <select id="captain-timezone" value={value.timezone} onChange={e => onChange({ ...value, timezone: e.target.value })}
        className={captainWorkspaceEnabled() ? `${editableFieldClass} ${fieldClass}` : fieldClass} aria-describedby="timezone-hint timezone-error" aria-invalid={!!errors.timezone}>
        {timezones.map(zone => <option key={zone} value={zone}>{zone}</option>)}
      </select>
      <p id="timezone-hint" className="text-sm text-muted">{t('timezoneHint')}</p>
      <p id="timezone-error" role="alert" className="text-sm text-danger">{errors.timezone}</p>
    </div>}
    <Segmented aria-label={t('units')} value={value.units} options={[
      { value: 'metric', label: t('metric') }, { value: 'imperial', label: t('imperial') },
    ]} onChange={units => { if (units === 'metric' || units === 'imperial') onChange({ ...value, units }); }} />
    {errors.units && <p role="alert" className="text-sm text-danger">{errors.units}</p>}
  </div>;
}

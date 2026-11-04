'use client';
import { useT } from '@/core/i18n/client';
import { Segmented, TextField } from '@/ui';
import { messages } from '../messages';
import { timezones } from '../schema';
import type { CaptainProfileInput } from '../schema';
import { PublicSlugField } from './public-slug-field';

export function CaptainProfileFields({ value, errors, onChange }: { value: CaptainProfileInput;
  errors: Record<string, string>; onChange: (value: CaptainProfileInput) => void }) {
  const t = useT(messages);
  const fieldClass = 'min-h-12 w-full rounded-control border border-line bg-surface px-4 py-3 text-start focus-visible:ring-2 focus-visible:ring-lime';
  return <div className="space-y-4">
    <PublicSlugField value={value.public_slug ?? ''} error={errors.public_slug} onChange={public_slug => onChange({ ...value, public_slug })} />
    <TextField label={t('fullName')} value={value.full_name} autoComplete="name" maxLength={80}
      onChange={e => onChange({ ...value, full_name: e.target.value })} error={errors.full_name} className="bg-surface" />
    <div className="space-y-2">
      <label htmlFor="captain-bio" className="text-sm font-semibold">{t('bio')}</label>
      <textarea id="captain-bio" value={value.bio} maxLength={280} rows={3} placeholder={t('bioPlaceholder')}
        onChange={e => onChange({ ...value, bio: e.target.value })} className={fieldClass}
        aria-invalid={!!errors.bio} aria-describedby={errors.bio ? 'bio-error' : undefined} />
      {errors.bio && <p id="bio-error" role="alert" className="text-sm text-danger">{errors.bio}</p>}
    </div>
    <TextField label={t('location')} value={value.location} maxLength={80} placeholder={t('locationPlaceholder')}
      onChange={e => onChange({ ...value, location: e.target.value })} error={errors.location} className="bg-surface" />
    <div className="space-y-2">
      <label htmlFor="captain-timezone" className="text-sm font-semibold">{t('timezone')}</label>
      <select id="captain-timezone" value={value.timezone} onChange={e => onChange({ ...value, timezone: e.target.value })}
        className={fieldClass} aria-describedby="timezone-hint timezone-error" aria-invalid={!!errors.timezone}>
        {timezones.map(zone => <option key={zone} value={zone}>{zone}</option>)}
      </select>
      <p id="timezone-hint" className="text-sm text-muted">{t('timezoneHint')}</p>
      <p id="timezone-error" role="alert" className="text-sm text-danger">{errors.timezone}</p>
    </div>
    <Segmented aria-label={t('units')} value={value.units} options={[
      { value: 'metric', label: t('metric') }, { value: 'imperial', label: t('imperial') },
    ]} onChange={units => { if (units === 'metric' || units === 'imperial') onChange({ ...value, units }); }} />
    {errors.units && <p role="alert" className="text-sm text-danger">{errors.units}</p>}
  </div>;
}

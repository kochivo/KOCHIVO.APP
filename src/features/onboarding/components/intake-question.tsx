'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { useEffect, useRef } from 'react';
import { TextField, Stepper } from '@/ui';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';
import { allergyOptions, injuryOptions, medicalOptions } from '../data/intake-schema';
import type { IntakeQuestion as Field } from '../v6-steps';
import type { IntakeDraft } from '../wizard';
import { ChipGroup } from './chip-group';
import { DayPicker } from './day-picker';
import { MetricSlider } from './metric-slider';

export function IntakeQuestion({ field, draft, update, year }: {
  field: Field; draft: IntakeDraft; update: (patch: IntakeDraft) => void; year: number;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => { heading.current?.focus(); }, []);
  const labels = { full_name: 'yourName', sex: 'sex', birth_year: 'age', height_cm: 'heightCm',
    weight_kg: 'currentWeightKg', target_weight_kg: 'targetWeightOptional', training_days: 'yourWeeklySchedule',
    session_minutes: 'workoutLength', experience: 'gymExperience', injuries: 'anyInjuriesOrPain',
    medical: 'doAnyOfTheseApply', allergies: 'anyFoodAllergies', notes: 'anythingYourCoachShouldKnowOptional' } as const;
  const label = t(labels[field]);
  const choices = field === 'sex' ? [{ value: 'male', label: t('male') }, { value: 'female', label: t('female') }]
    : field === 'session_minutes' ? [30, 45, 60, 90].map(value => ({ value, label: `${formatNumber(value, locale)} ${t('min')}` }))
      : field === 'experience' ? [
        { value: 'new', label: t('justStarting') }, { value: 'under_1y', label: t('lessThanAYear') },
        { value: '1_3y', label: t('message13Years') }, { value: 'over_3y', label: t('over3Years') },
      ] : [];
  return <div className="space-y-card-gap">
    <h1 ref={heading} tabIndex={-1} className="font-display text-2xl font-semibold outline-none">{label}</h1>
    {!!choices.length && <div role="group" aria-label={label} className="space-y-inline">{choices.map(choice =>
      <button type="button" key={choice.value} aria-pressed={draft[field] === choice.value}
        onClick={() => update({ [field]: choice.value })}
        className={`flex min-h-16 w-full items-center rounded-card border px-page-x py-page-y text-start ${draft[field] === choice.value ? 'border-lime bg-lime-soft' : 'glass border-line-soft text-muted'}`}>{choice.label}</button>)}</div>}
    {field === 'full_name' && <TextField label={label} autoComplete="name" maxLength={80} value={draft.full_name ?? ''}
      onChange={event => update({ full_name: event.target.value })} />}
    {field === 'birth_year' && <Stepper label={label} step={1} min={10} max={year - 1930} value={year - (draft.birth_year ?? year - 25)}
      format={value => formatNumber(value, locale)} onChange={age => update({ birth_year: year - age })} />}
    {(field === 'height_cm' || field === 'weight_kg' || field === 'target_weight_kg') && <MetricSlider field={field}
      label={label} value={draft[field] ?? (field === 'height_cm' ? 170 : 75)} onChange={value => update({ [field]: value })} onBlur={() => {}} />}
    {field === 'training_days' && <DayPicker value={draft.training_days ?? []} onChange={training_days => update({ training_days })} />}
    {field === 'injuries' && <ChipGroup label={label} options={injuryOptions} value={draft.injuries ?? []} onChange={injuries => update({ injuries })} />}
    {field === 'medical' && <><ChipGroup label={label} options={medicalOptions} value={draft.medical ?? []} onChange={medical => update({ medical })} />
      {draft.medical?.some(value => value !== 'none') && <p className="text-sm text-muted">{t('yourCoachWillReviewThisBeforePlanning')}</p>}</>}
    {field === 'allergies' && <ChipGroup label={label} options={allergyOptions} value={draft.allergies ?? []} onChange={allergies => update({ allergies })} />}
    {field === 'notes' && <><TextField label={label} value={draft.notes ?? ''} maxLength={500} placeholder={t('forExampleIWorkNightShifts')}
      onChange={event => update({ notes: Array.from(event.target.value).slice(0, 500).join('') })} />
      <p className="text-xs text-muted">{formatNumber(Array.from(draft.notes ?? '').length, locale)} {t('of500Characters')}</p></>}
  </div>;
}

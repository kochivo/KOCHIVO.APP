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
import { Dumbbell, TrendingUp, Weight, UserRound } from 'lucide-react';
import dynamic from 'next/dynamic';
const BudgetField = dynamic(() => import('@/features/meal-plans').then(module => module.BudgetField));

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
  const experienceIcons = [UserRound, Weight, Dumbbell, TrendingUp];
  return <div className="space-y-card-gap">
    <h1 ref={heading} tabIndex={-1} className="text-h font-bold outline-none">{label}</h1>
    {!!choices.length && <div role="group" aria-label={label} className="grid grid-cols-2 gap-stack">{choices.map((choice, index) => {
      const Icon = field === 'experience' ? experienceIcons[index] : null;
      return <button type="button" key={choice.value} aria-pressed={draft[field] === choice.value}
        onClick={() => update({ [field]: choice.value })}
        className="glass press flex min-h-20 flex-col items-center justify-center gap-inline rounded-card border border-line-soft p-stack text-center text-sm font-bold aria-pressed:border-lime aria-pressed:bg-lime-soft aria-pressed:text-lime">
        {Icon && <Icon aria-hidden className="size-5" />}{choice.label}
      </button>;
    })}</div>}
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
    {field === 'notes' && <><BudgetField value={draft.food_budget_monthly_egp} onChange={food_budget_monthly_egp => update({ food_budget_monthly_egp })} /><TextField label={label} value={draft.notes ?? ''} maxLength={500} placeholder={t('forExampleIWorkNightShifts')}
      onChange={event => update({ notes: Array.from(event.target.value).slice(0, 500).join('') })} />
      <p className="text-xs text-muted">{formatNumber(Array.from(draft.notes ?? '').length, locale)} {t('of500Characters')}</p></>}
  </div>;
}

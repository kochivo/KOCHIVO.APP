'use client';
import { useTimezone } from '@/core/timezone/client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { formatNumber } from '@/lib/format';
import { localDate } from '@/lib/dates';

import { Chip, Stepper, TextField } from '@/ui';
import type { StepProps } from '../wizard';
import { MetricSlider } from './metric-slider';

export function StepBasics({ draft, update, errors, touch }: StepProps) {
  const timezone = useTimezone();
  const t = useT(messages);
  const locale = useLocale();
  // The intake still stores birth_year; players find their age easier to pick than a year.
  const year = Number(localDate(new Date(), timezone).slice(0, 4));
  return (
    <div className="space-y-5">
      <TextField label={t('yourName')} autoComplete="name" maxLength={80} value={draft.full_name ?? ''}
        onChange={(event) => update({ full_name: event.target.value })} onBlur={() => touch('full_name')} error={errors.full_name} />
      <fieldset className="space-y-2" onBlur={() => touch('sex')}>
        <legend className="mb-2 text-sm text-muted">{t('sex')}</legend>
        <div className="flex gap-2">
          {([{ key: 'male', label: t('male') }, { key: 'female', label: t('female') }] as const).map(({ key, label }) => (
            <Chip key={key} pressed={draft.sex === key} className="min-h-12 flex-1 text-base font-bold"
              onClick={() => update({ sex: key })}>{label}</Chip>
          ))}
        </div>
        {errors.sex && <p role="alert" className="text-sm text-danger">{errors.sex}</p>}
      </fieldset>
      <div className="space-y-2" onBlur={() => touch('birth_year')}>
        <Stepper format={(value) => formatNumber(value, locale)} label={t('age')} value={year - (draft.birth_year ?? year - 25)}
          step={1} min={10} max={year - 1930} onChange={(age) => update({ birth_year: year - age })} />
        {errors.birth_year && <p role="alert" className="text-sm text-danger">{errors.birth_year}</p>}
      </div>
      {([
        { field: 'height_cm', label: t('heightCm'), value: 170 },
        { field: 'weight_kg', label: t('currentWeightKg'), value: 75 },
      ] as const).map(({ field, label, value }) => (
        <MetricSlider key={field} field={field} label={label} value={draft[field] ?? value}
          onChange={next => update({ [field]: next })} onBlur={() => touch(field)} error={errors[field]} />
      ))}
      <fieldset className="space-y-3" onBlur={() => touch('target_weight_kg')}>
        <legend className="mb-2 text-sm text-muted">{t('targetWeightOptional')}</legend>
        <Chip pressed={draft.target_weight_kg == null} onClick={() => update({ target_weight_kg: null })}>{t('notSet')}</Chip>
        <MetricSlider field="target_weight_kg" label={t('targetWeightKg')} value={draft.target_weight_kg ?? draft.weight_kg ?? 75}
          onChange={next => update({ target_weight_kg: next })} onBlur={() => touch('target_weight_kg')} error={errors.target_weight_kg} />
      </fieldset>
    </div>
  );
}

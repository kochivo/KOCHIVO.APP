'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { formatNumber } from '@/lib/format';

import { Chip } from '@/ui';
import { DayPicker } from './day-picker';
import type { StepProps } from '../wizard';

export function StepSchedule({ draft, update, errors, touch }: StepProps) {
  const t = useT(messages);
  const locale = useLocale();
  return (
    <div className="space-y-6">
      <div onBlur={() => touch('training_days')}>
        <DayPicker value={draft.training_days ?? []} onChange={(training_days) => update({ training_days })}
          error={errors.training_days} />
      </div>
      <fieldset className="space-y-3" onBlur={() => touch('session_minutes')}>
        <legend className="mb-2 text-sm text-muted">{t('workoutLength')}</legend>
        <div className="flex flex-wrap gap-2">
          {([30, 45, 60, 90] as const).map((minutes) => (
            <Chip key={minutes} pressed={draft.session_minutes === minutes} className="min-h-12 flex-1 text-base font-bold"
              onClick={() => update({ session_minutes: minutes })}>{formatNumber(minutes, locale)} {t('min')}</Chip>
          ))}
        </div>
        {errors.session_minutes && <p role="alert" className="text-sm text-danger">{errors.session_minutes}</p>}
      </fieldset>
      <fieldset className="space-y-3" onBlur={() => touch('experience')}>
        <legend className="mb-2 text-sm text-muted">{t('gymExperience')}</legend>
        <div className="flex flex-wrap gap-2">
          {([
            { key: 'new', label: t('justStarting') }, { key: 'under_1y', label: t('lessThanAYear') },
            { key: '1_3y', label: t('message13Years') }, { key: 'over_3y', label: t('over3Years') },
          ] as const).map(({ key, label }) => (
            <Chip key={key} pressed={draft.experience === key} className="min-h-12 px-5 text-base font-bold"
              onClick={() => update({ experience: key })}>{label}</Chip>
          ))}
        </div>
        {errors.experience && <p role="alert" className="text-sm text-danger">{errors.experience}</p>}
      </fieldset>
    </div>
  );
}

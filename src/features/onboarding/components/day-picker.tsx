'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { Chip } from '@/ui';

// Stored values follow JS getDay() and Postgres extract(dow): 0 = Sunday. Shown Saturday first.

export function DayPicker({ value, onChange, error }: {
  value: number[]; onChange: (days: number[]) => void; error?: string;
}) {
  const t = useT(messages);
  const days = [
    { label: t('saturday'), value: 6 }, { label: t('sunday'), value: 0 }, { label: t('monday'), value: 1 }, { label: t('tuesday'), value: 2 },
    { label: t('wednesday'), value: 3 }, { label: t('thursday'), value: 4 }, { label: t('friday'), value: 5 },
  ];
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm text-muted">{t('daysYouCanTrain')}</legend>
      <div className="flex flex-wrap gap-2">
        {days.map((day) => (
          <Chip key={day.value} pressed={value.includes(day.value)} className="min-h-12 px-5 text-base font-bold"
            onClick={() => onChange(value.includes(day.value) ? value.filter((item) => item !== day.value) : [...value, day.value])}>
            {day.label}
          </Chip>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </fieldset>
  );
}

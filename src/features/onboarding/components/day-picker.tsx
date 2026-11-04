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
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {days.map((day) => (
          <Chip key={day.value} pressed={value.includes(day.value)} className={`glass min-h-16 min-w-0 rounded-card px-2 text-base font-bold ${value.includes(day.value) ? 'border-lime shadow-lime-glow' : ''}`}
            onClick={() => onChange(value.includes(day.value) ? value.filter((item) => item !== day.value) : [...value, day.value])}>
            {day.label}
          </Chip>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </fieldset>
  );
}

'use client';

import { Chip } from '@/ui';

// Stored values follow JS getDay() and Postgres extract(dow): 0 = Sunday. Shown Saturday first.
const days = [
  { label: 'السبت', value: 6 }, { label: 'الحد', value: 0 }, { label: 'الاتنين', value: 1 }, { label: 'التلات', value: 2 },
  { label: 'الأربع', value: 3 }, { label: 'الخميس', value: 4 }, { label: 'الجمعة', value: 5 },
];

export function DayPicker({ value, onChange, error }: {
  value: number[]; onChange: (days: number[]) => void; error?: string;
}) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm text-muted">الأيام اللي تقدر تتمرن فيها</legend>
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

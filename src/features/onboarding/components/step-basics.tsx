'use client';

import { Chip, Stepper } from '@/ui';
import type { StepProps } from '../wizard';

export function StepBasics({ draft, update, errors, touch }: StepProps) {
  return (
    <div className="space-y-5">
      <fieldset className="space-y-2" onBlur={() => touch('sex')}>
        <legend className="mb-2 text-sm text-muted">النوع</legend>
        <div className="flex gap-2">
          {([{ key: 'male', label: 'راجل' }, { key: 'female', label: 'ست' }] as const).map(({ key, label }) => (
            <Chip key={key} pressed={draft.sex === key} className="min-h-12 flex-1 text-base font-bold"
              onClick={() => update({ sex: key })}>{label}</Chip>
          ))}
        </div>
        {errors.sex && <p role="alert" className="text-sm text-danger">{errors.sex}</p>}
      </fieldset>
      {([
        { field: 'birth_year', label: 'سنة ميلادك', value: 1998, step: 1, min: 1930 },
        { field: 'height_cm', label: 'الطول · سم', value: 170, step: 1, min: 100 },
        { field: 'weight_kg', label: 'وزنك دلوقتي · كجم', value: 75, step: 0.5, min: 25 },
      ] as const).map(({ field, label, value, step, min }) => (
        <div key={field} className="space-y-2" onBlur={() => touch(field)}>
          <Stepper label={label} value={draft[field] ?? value} step={step} min={min}
            onChange={(next) => update({ [field]: next })} />
          {errors[field] && <p role="alert" className="text-sm text-danger">{errors[field]}</p>}
        </div>
      ))}
      <fieldset className="space-y-3" onBlur={() => touch('target_weight_kg')}>
        <legend className="mb-2 text-sm text-muted">الوزن اللي عايزه · اختياري</legend>
        <Chip pressed={draft.target_weight_kg == null} onClick={() => update({ target_weight_kg: null })}>مش محدد</Chip>
        <Stepper label="الوزن اللي عايزه · كجم" value={draft.target_weight_kg ?? draft.weight_kg ?? 75}
          step={0.5} min={25} onChange={(next) => update({ target_weight_kg: next })} />
        {errors.target_weight_kg && <p role="alert" className="text-sm text-danger">{errors.target_weight_kg}</p>}
      </fieldset>
    </div>
  );
}

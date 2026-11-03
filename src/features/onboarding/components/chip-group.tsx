'use client';

import { Chip } from '@/ui';
import { toggleChip } from '../data/intake-schema';

type Props<Key extends string> = {
  label: string;
  options: readonly { key: Key; label: string }[];
  value: readonly Key[];
  onChange: (value: Key[]) => void;
  error?: string;
};

export function ChipGroup<Key extends string>({ label, options, value, onChange, error }: Props<Key>) {
  return (
    <fieldset className="space-y-3">
      <legend className="text-sm text-muted">{label}</legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <Chip key={option.key} pressed={value.includes(option.key)} className="min-h-12 px-5 text-base font-bold"
            onClick={() => onChange(toggleChip(value, option.key))}>{option.label}</Chip>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </fieldset>
  );
}

'use client';
import { useT } from '@/core/i18n/client';
import type { MessageKey } from '@/core/i18n/messages';
import { messages } from '../messages';

import { Chip } from '@/ui';
import { toggleChip } from '../data/intake-schema';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

type Props<Key extends string> = {
  label: string;
  options: readonly { key: Key; label: MessageKey<typeof messages> }[];
  value: readonly Key[];
  onChange: (value: Key[]) => void;
  error?: string;
};

export function ChipGroup<Key extends string>({ label, options, value, onChange, error }: Props<Key>) {
  const t = useT(messages);
  const v6 = captainWorkspaceEnabled();
  return (
    <fieldset className="space-y-stack">
      <legend className="text-sm text-muted">{label}</legend>
      <div className={v6 ? 'grid gap-inline' : 'flex flex-wrap gap-inline'}>
        {options.map((option) => (
          v6 ? <button type="button" key={option.key} aria-pressed={value.includes(option.key)}
            className={`min-h-16 rounded-card border px-page-x py-page-y text-start ${value.includes(option.key) ? 'border-lime bg-lime-soft' : 'glass border-line-soft text-muted'}`}
            onClick={() => onChange(toggleChip(value, option.key))}>{t(option.label)}</button>
            : <Chip key={option.key} pressed={value.includes(option.key)} className="min-h-12 px-page-x text-base font-bold"
              onClick={() => onChange(toggleChip(value, option.key))}>{t(option.label)}</Chip>
        ))}
      </div>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    </fieldset>
  );
}

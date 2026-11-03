'use client';

import { TextField } from '@/ui';
import { allergyOptions } from '../data/intake-schema';
import { ChipGroup } from './chip-group';
import type { StepProps } from '../wizard';

export function StepFood({ draft, update, errors, touch }: StepProps) {
  return (
    <div className="space-y-6">
      <div onBlur={() => touch('allergies')}>
        <ChipGroup label="عندك حساسية من أكل؟" options={allergyOptions} value={draft.allergies ?? []}
          onChange={(allergies) => update({ allergies })} error={errors.allergies} />
      </div>
      <TextField label="حاجة عايز الكابتن يعرفها؟ (اختياري)" value={draft.notes ?? ''}
        placeholder="مثلاً: بشتغل شيفت بالليل" maxLength={500}
        onChange={(event) => update({ notes: Array.from(event.target.value).slice(0, 500).join('') })}
        onBlur={() => touch('notes')} error={errors.notes} aria-describedby="intake-notes-count" />
      <p id="intake-notes-count" aria-live="polite" className="text-sm text-muted">
        {Array.from(draft.notes ?? '').length} من 500 حرف
      </p>
    </div>
  );
}

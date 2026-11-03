'use client';

import { injuryOptions, medicalOptions } from '../data/intake-schema';
import { ChipGroup } from './chip-group';
import type { StepProps } from '../wizard';

export function StepHealth({ draft, update, errors, touch }: StepProps) {
  return (
    <div className="space-y-6">
      <div onBlur={() => touch('injuries')}>
        <ChipGroup label="عندك إصابة أو وجع في؟" options={injuryOptions} value={draft.injuries ?? []}
          onChange={(injuries) => update({ injuries })} error={errors.injuries} />
      </div>
      <div onBlur={() => touch('medical')}>
        <ChipGroup label="عندك حاجة من دول؟" options={medicalOptions} value={draft.medical ?? []}
          onChange={(medical) => update({ medical })} error={errors.medical} />
      </div>
      {draft.medical?.some((key) => key !== 'none') && (
        <p className="text-sm leading-relaxed text-muted">
          الكابتن هيشوف ده قبل ما يكتب برنامجك. لو عندك حالة طبية استشير دكتور الأول.
        </p>
      )}
    </div>
  );
}

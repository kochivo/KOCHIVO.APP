'use client';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { injuryOptions, medicalOptions } from '../data/intake-schema';
import { ChipGroup } from './chip-group';
import type { StepProps } from '../wizard';

export function StepHealth({ draft, update, errors, touch }: StepProps) {
  const t = useT(messages);
  return (
    <div className="space-y-section">
      <div data-intake-field="injuries" onBlur={() => touch('injuries')}>
        <ChipGroup label={t('anyInjuriesOrPain')} options={injuryOptions} value={draft.injuries ?? []}
          onChange={(injuries) => update({ injuries })} error={errors.injuries} />
      </div>
      <div data-intake-field="medical" onBlur={() => touch('medical')}>
        <ChipGroup label={t('doAnyOfTheseApply')} options={medicalOptions} value={draft.medical ?? []}
          onChange={(medical) => update({ medical })} error={errors.medical} />
      </div>
      {draft.medical?.some((key) => key !== 'none') && (
        <p className="text-sm leading-relaxed text-muted">

          {t('yourCoachWillReviewThisBeforePlanning')}
        </p>
      )}
    </div>
  );
}

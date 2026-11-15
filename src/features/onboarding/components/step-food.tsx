'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { formatNumber } from '@/lib/format';

import { TextField } from '@/ui';
import { allergyOptions } from '../data/intake-schema';
import { ChipGroup } from './chip-group';
import type { StepProps } from '../wizard';
import dynamic from 'next/dynamic';
const BudgetField = dynamic(() => import('@/features/meal-plans').then(module => module.BudgetField));

export function StepFood({ draft, update, errors, touch }: StepProps) {
  const t = useT(messages);
  const locale = useLocale();
  return (
    <div className="space-y-section">
      <BudgetField value={draft.food_budget_monthly_egp} onChange={food_budget_monthly_egp => update({ food_budget_monthly_egp })} error={errors.food_budget_monthly_egp} />
      <div onBlur={() => touch('allergies')}>
        <ChipGroup label={t('anyFoodAllergies')} options={allergyOptions} value={draft.allergies ?? []}
          onChange={(allergies) => update({ allergies })} error={errors.allergies} />
      </div>
      <TextField label={t('anythingYourCoachShouldKnowOptional')} value={draft.notes ?? ''}
        placeholder={t('forExampleIWorkNightShifts')} maxLength={500}
        onChange={(event) => update({ notes: Array.from(event.target.value).slice(0, 500).join('') })}
        onBlur={() => touch('notes')} error={errors.notes} aria-describedby="intake-notes-count" />
      <p id="intake-notes-count" aria-live="polite" className="text-sm text-muted">
        {formatNumber(Array.from(draft.notes ?? '').length, locale)} {t('of500Characters')}
      </p>
    </div>
  );
}

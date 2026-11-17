'use client';
import { NumberInput } from '@/ui/number-input';

import { useLocale, useT } from '@/core/i18n/client';
import { waterGoalMl } from '@/features/readiness';
import { formatNumber } from '@/lib/format';
import { messages } from './water/messages';
import { waterTargetMl } from './water-target-value';

export function WaterTarget({ value, weightKg, disabled, onChange }: {
  value?: number | null; weightKg?: number | null; disabled?: boolean; onChange: (value: number | null) => void;
}) {
  const t = useT(messages), locale = useLocale();
  const hint = weightKg != null && weightKg > 0 ? t('hint', {
    litres: formatNumber(Math.round(waterGoalMl(weightKg) / 100) / 10, locale),
  }) : t('empty');
  return <div className="mb-card-gap rounded-card glass p-card">
    <NumberInput label={t('label')} placeholder={t('automatic')} hint={hint}
      min={0.5} max={10} step={0.25} disabled={disabled}
      value={value == null ? null : value / 1000} allowEmpty
      onCommit={litres => onChange(litres === null ? null : waterTargetMl(String(litres)))} />
  </div>;
}

'use client';
import { useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { TextField } from '@/ui/text-field';
import { dailyBudget } from '../budget-plan';
import { messages } from '../budget/messages';
import { useTimezone } from '@/core/timezone/client';

export function BudgetField({ value, onChange, error, timezone }: {
  value: number | null | undefined; onChange: (value: number | null) => void; error?: string; timezone?: string;
}) {
  const t = useT(messages), locale = useLocale();
  const playerTimezone = useTimezone();
  const [now] = useState(() => new Date());
  return <div className="space-y-inline">
    <TextField type="number" inputMode="numeric" min={300} max={100000} step={1} label={t('monthly')}
      value={value ?? ''} onChange={event => onChange(event.target.value === '' ? null : Number(event.target.value))}
      error={error ?? (value != null && (!Number.isInteger(value) || value < 300 || value > 100000) ? t('range') : undefined)} />
    <p className="text-xs text-muted">{t('hint')}</p>
    {value != null && value >= 300 && value <= 100000 && <p aria-live="polite" className="text-sm text-muted"><bdi>{t('daily', { n: formatNumber(Math.round(dailyBudget(value, now, timezone ?? playerTimezone)), locale) })}</bdi></p>}
  </div>;
}

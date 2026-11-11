'use client';

import { useId, useState } from 'react';
import type { FormSource } from '@/features/player-file';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from './calculator/messages';
import { CalculatorSource } from './calculator-source';

export function CalculatorField({ label, value, source, onChange, min = 1, max = 500, step = .1 }: {
  label: string; value?: number; source?: FormSource; onChange: (value: number | undefined) => void;
  min?: number; max?: number; step?: number;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const id = useId();
  const [editing, setEditing] = useState(false);
  return <div className="glass grid gap-2 rounded-control p-4">
    <label htmlFor={id} className="font-semibold">{label}</label>
    <CalculatorSource source={source} local={value !== undefined} />
    {editing ? <input id={id} autoFocus type="number" min={min} max={max} step={step} value={value ?? ''}
      onChange={event => onChange(event.target.value === '' ? undefined : Number(event.target.value))}
      className="min-h-12 w-full rounded-control border border-line bg-surface px-3" />
      : value === undefined ? <button id={id} type="button" aria-label={`${t('add')} ${label}`}
        className="min-h-12 rounded-control border border-line px-4" onClick={() => setEditing(true)}>{t('add')}</button>
        : <output id={id} className="text-2xl font-bold">{formatNumber(value, locale)}</output>}
  </div>;
}

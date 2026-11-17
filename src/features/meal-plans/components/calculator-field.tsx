'use client';
import { NumberInput } from '@/ui/number-input';

import { useId, useState } from 'react';
import type { FormSource } from '@/features/player-file';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from './calculator/messages';
import { CalculatorSource } from './calculator-source';
import { Button } from '@/ui/button';

export function CalculatorField({ label, value, source, onChange, min = 1, max = 500, step = .1 }: {
  label: string; value?: number; source?: FormSource; onChange: (value: number | undefined) => void;
  min?: number; max?: number; step?: number;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const id = useId();
  const [editing, setEditing] = useState(false);
  return <div className="glass grid gap-inline rounded-control p-card">
    <label htmlFor={id} className="font-semibold">{label}</label>
    <CalculatorSource source={source} local={value !== undefined} />
    {editing ? <NumberInput allowEmpty id={id} autoFocus min={min} max={max} step={step} value={value ?? ''}
      onCommit={value => onChange(value === null ? undefined : value)}
      className="min-h-12 w-full rounded-control border border-line bg-surface px-stack" />
      : value === undefined ? <Button id={id} type="button" aria-label={`${t('add')} ${label}`}
        variant={'secondary'} block={false} className={"min-h-12 px-page-x"} onClick={() => setEditing(true)}>{t('add')}</Button>
        : <output id={id} className="text-2xl font-bold">{formatNumber(value, locale)}</output>}
  </div>;
}

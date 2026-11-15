'use client';

import { useId } from 'react';
import { useT } from '@/core/i18n/client';
import { messages } from '../analytics/messages';

export function WeekSlider({ value, onChange }: { value: number; onChange: (week: number) => void }) {
  const t = useT(messages);
  const id = useId();
  return <div className="space-y-inline">
    <label htmlFor={id} className="flex justify-between gap-stack text-sm font-bold">
      <span>{t('weekRange')}</span><span className="text-lime">{t('week', { number: value })}</span>
    </label>
    <input id={id} type="range" min={1} max={4} step={1} value={value}
      aria-valuetext={t('week', { number: value })}
      onChange={event => onChange(Number(event.currentTarget.value))}
      className="min-h-12 w-full cursor-pointer accent-lime focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-lime" />
    <div aria-hidden className="flex justify-between text-xs text-muted">
      {[1, 2, 3, 4].map(number => <span key={number}>{t('week', { number })}</span>)}
    </div>
  </div>;
}

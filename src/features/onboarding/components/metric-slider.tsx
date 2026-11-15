'use client';

import { useId } from 'react';
import { useLocale } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Stepper } from '@/ui';
import { clampMetric, metricBounds } from '../wizard';
import type { Metric } from '../wizard';

export function MetricSlider({ field, label, value, onChange, onBlur, error }: {
  field: Metric;
  label: string;
  value: number;
  onChange: (value: number) => void;
  onBlur: () => void;
  error?: string;
}) {
  const id = useId();
  const locale = useLocale();
  const { min, max, step } = metricBounds[field];
  const change = (next: number) => onChange(clampMetric(field, next));
  return (
    <div className="space-y-inline" onBlur={onBlur}>
      <Stepper label={label} value={value} min={min} max={max} step={step}
        format={next => formatNumber(next, locale)} onChange={change} />
      <input type="range" aria-label={label} aria-valuetext={formatNumber(value, locale)}
        aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined}
        min={min} max={max} step="any" value={clampMetric(field, value)}
        onChange={event => change(event.target.valueAsNumber)}
        className="min-h-12 w-full cursor-pointer appearance-none rounded-control bg-transparent accent-lime
          [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-control [&::-webkit-slider-runnable-track]:bg-line
          [&::-webkit-slider-thumb]:-mt-2 [&::-webkit-slider-thumb]:size-6 [&::-webkit-slider-thumb]:appearance-none
          [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-lime [&::-webkit-slider-thumb]:shadow-lime-glow
          [&::-moz-range-track]:h-2 [&::-moz-range-track]:rounded-control [&::-moz-range-track]:bg-line
          [&::-moz-range-thumb]:size-6 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-lime" />
      {error && <p id={`${id}-error`} role="alert" className="text-sm text-danger">{error}</p>}
    </div>
  );
}

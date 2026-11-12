'use client';
import { Check } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { exerciseName } from '@/lib/display-name';
import { formatNumber } from '@/lib/format';
import type { useFocusSession } from '../hooks/use-focus-session';
import { RampLine } from './ramp-line';
import { messages } from '../warmup/messages';

export function WarmupPreview({ state }: { state: ReturnType<typeof useFocusSession> }) {
  const locale = useLocale();
  const t = useT(messages);
  const { current, day } = state;
  if (!current || !day) return null;
  return <div className="space-y-2">
    <p className="text-sm font-medium"><bdi>{exerciseName(current.exercise, locale)}</bdi></p>
    <RampLine day={day} exercise={current.exercise} bodyweight={state.bodyweight} last={state.lastSession} />
    <div aria-hidden className="space-y-2">{Array.from({ length: Math.min(2, current.exercise.sets) }, (_, index) =>
      <div key={index} className="grid grid-cols-[30px_minmax(0,1fr)_minmax(0,1fr)_56px] items-center gap-2">
        <span className="text-center text-xs tabular-nums text-faint">{formatNumber(index + 1, locale)}</span>
        {[state.weight || null, index === 0 ? state.reps : null].map((value, column) =>
          <span key={column} className="flex min-h-[52px] items-center justify-center rounded-control border border-line font-display text-lg font-extrabold tabular-nums">
            {value === null ? t('blank') : formatNumber(value, locale)}
          </span>)}
        <span className="flex min-h-[52px] items-center justify-center rounded-control border border-line text-muted"><Check aria-hidden className="size-5" /></span>
      </div>)}</div>
  </div>;
}

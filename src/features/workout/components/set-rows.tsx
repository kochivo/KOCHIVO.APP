'use client';
import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import type { useFocusSession } from '../hooks/use-focus-session';
import { messages } from '../messages';
import { messages as v6Messages } from '../v6-messages';

type SetRowsState = Pick<ReturnType<typeof useFocusSession>, 'current' | 'disabled' | 'doneSets' | 'invalid' |
  'weight' | 'reps' | 'bodyweight' | 'setWeight' | 'setReps' | 'setBodyweight' | 'complete' | 'edit'> & { rest: { remaining: number } };

export function SetRows({ state }: { state: SetRowsState }) {
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const locale = useLocale();
  const invalidRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (state.invalid) invalidRef.current?.focus(); }, [state.invalid]);
  if (!state.current) return null;
  const current = state.current;
  const blocked = state.disabled || state.rest.remaining > 0;
  return <section aria-label={t('exerciseSets')} className="space-y-2">
    <div className="grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_56px] items-center gap-2 text-center text-xs text-faint">
      <span>{v6t('number')}</span><span>{v6t('kg')}</span><span>{v6t('reps')}</span><span />
    </div>
    {Array.from({ length: current.exercise.sets }, (_, index) => {
      const setIndex = index + 1;
      const done = state.doneSets.find(row => row.program_exercise_id === current.exercise.id && row.set_index === setIndex);
      const active = setIndex === current.setIndex;
      return <div key={setIndex} aria-current={active ? 'step' : undefined}
        className="grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_56px] items-center gap-2">
        <span className="text-center font-display text-sm text-faint">{formatNumber(setIndex, locale)}</span>
        {active ? <>
          <input ref={state.invalid?.result !== 'reps' && !state.bodyweight ? invalidRef : undefined} aria-label={t('weightKg')}
            aria-invalid={state.invalid?.result === 'weight' || state.invalid?.result === 'both'}
            type="number" inputMode="decimal" min={0} max={500} step={2.5} value={state.weight}
            disabled={blocked || state.bodyweight} onChange={event => state.setWeight(Number(event.target.value))}
            className="glass-strong min-h-14 w-full min-w-0 rounded-control border border-lime p-2 text-center font-display text-2xl font-extrabold tabular-nums" />
          <input ref={state.invalid?.result === 'reps' || state.bodyweight ? invalidRef : undefined} aria-label={t('reps')}
            aria-invalid={state.invalid?.result === 'reps' || state.invalid?.result === 'both'}
            type="number" inputMode="numeric" min={0} max={100} step={1} value={state.reps}
            disabled={blocked} onChange={event => state.setReps(Number(event.target.value))}
            className="glass-strong min-h-14 w-full min-w-0 rounded-control border border-lime p-2 text-center font-display text-2xl font-extrabold tabular-nums" />
        </> : <>{[done?.weight_kg, done?.reps].map((value, column) => <span key={column}
          className="glass-strong flex min-h-14 items-center justify-center rounded-control border border-line-soft font-display text-2xl font-extrabold tabular-nums">
          {value == null ? '—' : formatNumber(value, locale)}</span>)}</>}
        <button type="button" disabled={active ? blocked : !done || state.disabled}
          aria-label={active ? t('completeSet') : t('editSet', { value0: formatNumber(setIndex, locale) })}
          aria-pressed={Boolean(done)} onClick={() => { if (active) void state.complete(); else if (done) state.edit(done); }}
          className={`flex min-h-14 min-w-14 items-center justify-center rounded-control border ${done || active ? 'border-lime bg-lime text-on-lime' : 'border-line-soft text-faint'}`}>
          <Check aria-hidden className="size-6" />
        </button>
      </div>;
    })}
    {state.invalid && <p role="alert" className="text-sm text-danger">{t(state.invalid.result === 'reps' ? 'enterReps' : 'enterWeightAndReps')}</p>}
    <button type="button" aria-pressed={state.bodyweight} onClick={() => state.setBodyweight(!state.bodyweight)}
      disabled={blocked} className="min-h-12 rounded-full border border-line-soft px-4 text-xs text-muted">{t('bodyweight')}</button>
  </section>;
}

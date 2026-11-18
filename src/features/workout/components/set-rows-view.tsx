'use client';
import { useCallback, useEffect, useId, useRef } from 'react';
import { Check, Pencil } from 'lucide-react';
import type { Locale } from '@/core/i18n/locale';
import type { Translator } from '@/core/i18n/messages';
import { formatNumber } from '@/lib/format';
import type { useFocusSession } from '../hooks/use-focus-session';
import type { messages } from '../messages';
import type { messages as v6Messages } from '../v6-messages';
import type { messages as alternativeMessages } from '../alternatives/messages';
import { Button } from '@/ui/button';
import { parseSetValue } from '../set-validation';
import type { SetValueKind } from '../set-validation';
import { targetForSet } from '@/lib/set-plan';

export type SetRowsState = Pick<ReturnType<typeof useFocusSession>, 'current' | 'disabled' | 'doneSets' | 'invalid' |
  'weight' | 'reps' | 'bodyweight' | 'setWeight' | 'setReps' | 'setBodyweight' | 'complete' | 'edit'> & Partial<Pick<ReturnType<typeof useFocusSession>, 'typedValues' | 'typedWeightInvalid' | 'typedRepsInvalid' | 'setTypedValue'>> & { rest: { remaining: number } };

export function SetRowsView({ state, secondary = false, separateCompletedStatus = false, t, v6t, at, locale, v6, source }: {
  state: SetRowsState; secondary?: boolean; t: Translator<typeof messages>; v6t: Translator<typeof v6Messages>;
  at: Translator<typeof alternativeMessages>; locale: Locale; v6: boolean; source?: string; separateCompletedStatus?: boolean;
}) {
  const weightError = useId();
  const repsError = useId();
  const invalidRef = useRef<HTMLInputElement>(null);
  useEffect(() => { if (state.invalid) invalidRef.current?.focus(); }, [state.invalid]);
  const step = state.current && `${state.current.exercise.id}:${state.current.setIndex}`;
  const focusActive = useCallback((input: HTMLInputElement | null) => {
    if (step && !secondary && input && !input.disabled) input.focus();
  }, [step, secondary]);
  if (!state.current) return null;
  const current = state.current;
  const blocked = state.disabled || state.rest.remaining > 0;
  const typedInvalid = state.typedWeightInvalid || state.typedRepsInvalid;
  const change = (kind: SetValueKind, text: string) => {
    if (state.setTypedValue) state.setTypedValue(kind, text);
    else (kind === 'weight' ? state.setWeight : state.setReps)(Number(text));
  };
  const commit = (kind: SetValueKind, text: string) => {
    if (state.typedValues?.[kind] === undefined) return;
    const value = parseSetValue(kind, text);
    if (value !== null) (kind === 'weight' ? state.setWeight : state.setReps)(value);
  };
  return <section aria-label={t('exerciseSets')} className="space-y-inline">
    <div className="grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_56px] items-center gap-inline text-center text-xs text-faint">
      <span>{v6t('number')}</span><span>{v6t('kg')}</span><span>{v6t('reps')}</span><span />
    </div>
    {Array.from({ length: current.exercise.sets }, (_, index) => {
      const setIndex = index + 1;
      const done = state.doneSets.find(row => row.program_exercise_id === current.exercise.id && row.set_index === setIndex && (row.drop_index ?? 0) === 0);
      const active = setIndex === current.setIndex && (current.dropIndex ?? 0) === 0;
      const target = targetForSet(current.exercise, index);
      return <div key={setIndex} className="space-y-inline">
        {current.exercise.set_plan && <p className="text-xs text-muted"><bdi>{at('target', { reps: target.reps_max === null ? at('failure') :
          target.reps_min === target.reps_max ? formatNumber(target.reps_min, locale) : at('range', {
            min: formatNumber(target.reps_min, locale), max: formatNumber(target.reps_max, locale) }) })}
          {target.rir !== null && at('rir', { n: formatNumber(target.rir, locale) })}</bdi></p>}
        <div aria-current={active ? 'step' : undefined}
        className="grid grid-cols-[24px_minmax(0,1fr)_minmax(0,1fr)_56px] items-center gap-inline">
        <span className="relative text-center font-display text-sm text-faint">{formatNumber(setIndex, locale)}
          {done && separateCompletedStatus && <><Check aria-hidden className="absolute start-1/2 top-full size-3 -translate-x-1/2 rtl:translate-x-1/2" /><span className="sr-only">{t('setCompleted')}</span></>}
        </span>
        {active ? <>
          <input ref={state.invalid?.result !== 'reps' && !state.bodyweight ? invalidRef : undefined} aria-label={t('weightKg')}
            aria-invalid={state.typedWeightInvalid || state.invalid?.result === 'weight' || state.invalid?.result === 'both'} aria-describedby={state.typedWeightInvalid ? weightError : undefined}
            type={state.setTypedValue ? "text" : "number"} inputMode="decimal" min={0} max={500} step={2.5} value={state.bodyweight ? state.weight : state.typedValues?.weight ?? state.weight}
            disabled={blocked || state.bodyweight} onChange={event => change('weight', event.target.value)} onBlur={event => commit('weight', event.target.value)}
            className="glass-strong min-h-14 w-full min-w-0 rounded-control border border-lime p-inline text-center font-display text-2xl font-extrabold tabular-nums" />
          <input ref={state.invalid?.result === 'reps' || state.bodyweight ? invalidRef : state.setTypedValue ? focusActive : undefined} aria-label={t('reps')}
            aria-invalid={state.typedRepsInvalid || state.invalid?.result === 'reps' || state.invalid?.result === 'both'} aria-describedby={state.typedRepsInvalid ? repsError : undefined}
            type={state.setTypedValue ? "text" : "number"} inputMode="numeric" min={0} max={100} step={1} value={state.typedValues?.reps ?? state.reps}
            disabled={blocked} onChange={event => change('reps', event.target.value)} onBlur={event => commit('reps', event.target.value)}
            className="glass-strong min-h-14 w-full min-w-0 rounded-control border border-lime p-inline text-center font-display text-2xl font-extrabold tabular-nums" />
        </> : <>{[done?.weight_kg, done?.reps].map((value, column) => <span key={column}
          className="glass-strong flex min-h-14 items-center justify-center rounded-control border border-line-soft font-display text-2xl font-extrabold tabular-nums">
          {value == null ? '—' : formatNumber(value, locale)}</span>)}</>}
        <button data-demo-source={active ? source : undefined} type="button" disabled={active ? blocked || typedInvalid : !done || state.disabled}
          aria-label={active ? t('completeSet') : t('editSet', { value0: formatNumber(setIndex, locale) })}
          aria-pressed={separateCompletedStatus ? undefined : Boolean(done)}
          onClick={() => { if (active) void state.complete(); else if (done) state.edit(done); }}
          className={`flex min-h-14 min-w-14 items-center justify-center rounded-control border ${secondary ? 'border-line-soft text-ink' : v6 ? active ? 'border-lime bg-lime text-on-lime' : 'glass border-line-soft text-ink' : done || active ? 'border-lime bg-lime text-on-lime' : 'border-line-soft text-faint'}`}>
          {done && !active && separateCompletedStatus ? <Pencil aria-hidden className="size-6" /> : <Check aria-hidden className="size-6" />}
        </button>
      </div>
      {active && typedInvalid && <>
        {state.typedWeightInvalid && <p id={weightError} role="alert" className="text-sm text-danger">{t('typedWeightError')}</p>}
        {state.typedRepsInvalid && <p id={repsError} role="alert" className="text-sm text-danger">{t('typedRepsError')}</p>}
        <Button variant="secondary" onClick={() => {
          if (state.typedWeightInvalid) state.setTypedValue?.('weight');
          if (state.typedRepsInvalid) state.setTypedValue?.('reps');
        }}>{t('revertSetValue')}</Button>
      </>}
      </div>;
    })}
    {state.invalid && <p role="alert" className="text-sm text-danger">{t(state.invalid.result === 'reps' ? 'enterReps' : 'enterWeightAndReps')}</p>}
    <button type="button" aria-pressed={state.bodyweight} onClick={() => state.setBodyweight(!state.bodyweight)}
      disabled={blocked} className="min-h-12 rounded-full border border-line-soft px-page-x text-xs text-muted">{t('bodyweight')}</button>
  </section>;
}

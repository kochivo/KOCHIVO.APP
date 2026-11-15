'use client';
import { useEffect, useRef } from 'react';
import { Check } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button, Chip, Stepper } from '@/ui';
import type { useFocusSession } from '../hooks/use-focus-session';
import { messages } from '../messages';

export function SetControls({ state, secondary = false }: { state: ReturnType<typeof useFocusSession>; secondary?: boolean }) {
  const t = useT(messages);
  const locale = useLocale();
  const weightRef = useRef<HTMLDivElement>(null);
  const repsRef = useRef<HTMLDivElement>(null);
  const issue = state.invalid?.result;
  const weightInvalid = !state.bodyweight && state.weight <= 0 && (issue === 'weight' || issue === 'both');
  const repsInvalid = state.reps < 1 && (issue === 'reps' || issue === 'both');
  useEffect(() => {
    if (state.invalid) (state.invalid.result === 'reps' || state.bodyweight ? repsRef : weightRef).current?.focus();
  }, [state.invalid, state.bodyweight]);
  return <>
    {!state.bodyweight && <div ref={weightRef} tabIndex={-1} role="group" aria-label={t('weightKg')}
      aria-describedby={weightInvalid ? 'set-error' : undefined}
      className={weightInvalid ? 'rounded-card ring-2 ring-danger' : undefined}>
      <Stepper format={value => formatNumber(value, locale)} label={t('weightKg')} value={state.weight} step={2.5} min={0} onChange={state.setWeight}
        hint={state.performance?.weight_kg != null ? t('lastTimeWeight', { value: formatNumber(state.performance.weight_kg, locale) }) : undefined} />
    </div>}
    <Chip pressed={state.bodyweight} onClick={() => state.setBodyweight(!state.bodyweight)}>{t('bodyweight')}</Chip>
    <div ref={repsRef} tabIndex={-1} role="group" aria-label={t('reps')}
      aria-describedby={repsInvalid ? 'set-error' : undefined} className={repsInvalid ? 'rounded-card ring-2 ring-danger' : undefined}>
      <Stepper format={value => formatNumber(value, locale)} label={t('reps')} value={state.reps} step={1} min={0} onChange={state.setReps}
        hint={state.performance?.reps != null ? t('lastTimeReps', { value: formatNumber(state.performance.reps, locale) }) : undefined} />
    </div>
    {state.invalid && <p id="set-error" role="alert" className="text-danger">{t(issue === 'reps' ? 'enterReps' : 'enterWeightAndReps')}</p>}
    <Button variant={secondary ? 'secondary' : 'primary'} size="lg" className="min-h-17 w-full px-6 text-xl" disabled={state.disabled} onClick={() => void state.complete()}>
      <Check aria-hidden />{t('completeSet')}
    </Button>
  </>;
}

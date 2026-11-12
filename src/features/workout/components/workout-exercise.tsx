'use client';
import dynamic from 'next/dynamic';
import { useT } from '@/core/i18n/client';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import type { useFocusSession } from '../hooks/use-focus-session';
import { messages as v6Messages } from '../v6-messages';
import { ExerciseHeader } from './exercise-header';
import { SetRows } from './set-rows';
import { SetDots } from './set-dots';
import { SetControls } from './set-controls';
import { RestPanel } from './rest-panel';
import { NextUp } from './next-up';

const FormCheckButton = dynamic(() => import('./form-check-button').then(module => module.FormCheckButton), { ssr: false });
const RampLine = dynamic(() => import('./ramp-line').then(module => module.RampLine), { ssr: false });

export function WorkoutExercise({ state }: { state: ReturnType<typeof useFocusSession> }) {
  const t = useT(v6Messages);
  const v6 = captainWorkspaceEnabled();
  const { current, rest } = state;
  if (!current) return null;
  const lastSet = state.doneSets.filter(row => row.program_exercise_id === current.exercise.id)
    .sort((a, b) => b.completed_at.localeCompare(a.completed_at))[0];
  return <>
    <ExerciseHeader exercise={current.exercise} last={state.lastSession} />
    {state.day?.warmup?.ramp && <RampLine day={state.day} exercise={current.exercise} bodyweight={state.bodyweight} last={state.lastSession} />}
    {v6 ? <SetRows state={state} /> : <SetDots exercise={current.exercise} currentIndex={current.setIndex} doneSets={state.doneSets}
      onEdit={state.edit} disabled={state.disabled} />}
    {rest.remaining > 0 ? <RestPanel remaining={rest.remaining} total={rest.total} sound={rest.sound} onToggleSound={rest.toggleSound}
      flashing={rest.flashing} onExtend={rest.extend} onSkip={rest.skip} /> : <>
      {v6 ? <details className="glass rounded-card p-4"><summary className="flex min-h-12 cursor-pointer items-center text-sm text-muted">{t('controls')}</summary><SetControls state={state} /></details> : <SetControls state={state} />}
    </>}
    {lastSet && <FormCheckButton exerciseId={lastSet.exercise_id} setLogId={lastSet.id} />}
    {state.next && <NextUp exercise={state.next.exercise} />}
  </>;
}

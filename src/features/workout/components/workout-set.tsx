'use client';
import { useCallback, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import dynamic from 'next/dynamic';
import { useLocale, useT } from '@/core/i18n/client';
import { localDb, useLiveQuery } from '@/core/offline';
import { exerciseMediaUrl } from '@/core/storage';
import { exerciseName } from '@/lib/display-name';
import { formatNumber } from '@/lib/format';
import { KoTraining } from '@/ui/icons';
import type { useFocusSession } from '../hooks/use-focus-session';
import { prHistory } from '../data/pr-history';
import { messages } from '../messages';
import { parseExerciseVideo } from '@/lib/exercise-video';
import { ExerciseLightbox } from './exercise-lightbox';
import { WorkoutValue } from './workout-value';
import { WorkoutHint } from './workout-hint';
import { RestPanel } from './rest-panel';
import { SetDots } from './set-dots';
import { SetRows } from './set-rows';
import { ExerciseHeader } from './exercise-header';
import { ExerciseAlternatives } from './exercise-alternatives';
import { RampLine } from './ramp-line';
import { NextUp } from './next-up';
import { targetForSet } from '@/lib/set-plan';
import { Button } from '@/ui/button';
import { DropProgress } from './drop-progress';
import { SupersetCue } from './superset-cue';
import { messages as setMessages } from '@/lib/training/messages';
import { supersetTag } from '@/lib/superset';
import { PainButton } from './pain-button';
import { PainLoadHint } from './pain-load-hint';
const ExerciseVideo = dynamic(() => import('./exercise-video').then(module => module.ExerciseVideo));

const FormCheckButton = dynamic(() => import('./form-check-button').then(module => module.FormCheckButton), { ssr: false });

export function WorkoutSet({ state }: { state: ReturnType<typeof useFocusSession> }) {
  const t = useT(messages);
  const st = useT(setMessages);
  const locale = useLocale();
  const current = state.current;
  const exerciseId = current?.exercise.exercise_id ?? '';
  const [historyFailed, setHistoryFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [gifExercise, setGifExercise] = useState<string | null>(null);
  const read = useCallback(() => prHistory(localDb(), exerciseId, ''), [exerciseId]);
  const history = useLiveQuery(read, useCallback(() => setHistoryFailed(true), []), attempt);
  if (!current || !state.day) return null;
  const name = exerciseName(current.exercise, locale);
  const showGif = gifExercise === exerciseId;
  const blocked = state.disabled || state.rest.remaining > 0 || state.painBlocked;
  const lastSet = state.doneSets.filter(row => row.program_exercise_id === current.exercise.id)
    .sort((a, b) => b.completed_at.localeCompare(a.completed_at))[0];
  const target = current.exercise.set_plan ? { ...current.exercise, ...targetForSet(current.exercise, current.setIndex - 1) } : current.exercise;
  const dropping = (current.dropIndex ?? 0) > 0;
  const nextMember = state.next && state.next.exercise.id !== current.exercise.id && current.exercise.superset_group !== null &&
    state.next.exercise.superset_group === current.exercise.superset_group && current.restAfter === 0;
  return <>
    <div className="flex min-h-[calc(100dvh-160px)] flex-col gap-card-gap">
      <SupersetCue state={state} />
      <PainButton state={state} />
      <PainLoadHint hint={current.exercise.pain_hint} today={state.today} weight={state.weight} onSkip={() => void state.skipExercise(current.exercise.id)} />
      {!dropping && (parseExerciseVideo(current.exercise.video_url) ? <div className="space-y-stack">
        {showGif && current.exercise.media_path ? <ExerciseLightbox src={exerciseMediaUrl(current.exercise.media_path)} name={name} focus /> :
          <ExerciseVideo key={current.exercise.video_url} url={current.exercise.video_url} name={name} />}
        {current.exercise.media_path && <Button variant="secondary" aria-pressed={showGif} onClick={() => setGifExercise(showGif ? null : exerciseId)}
          className="flex min-h-12 w-full items-center gap-inline text-sm">{t('gifToggle')}<ChevronDown aria-hidden className={`ms-auto size-4 transition-transform ${showGif ? 'rotate-180' : ''}`} /></Button>}
      </div> : current.exercise.media_path && <ExerciseLightbox src={exerciseMediaUrl(current.exercise.media_path)} name={name} focus />)}
      <div className="flex flex-col gap-inline"><h1 style={{ fontFamily: 'inherit', fontWeight: 900 }} className="text-2xl leading-normal"><bdi>{name}</bdi></h1>
        <p className="text-row text-muted">{t('v3Set', { current: formatNumber(current.setIndex, locale), total: formatNumber(current.exercise.sets, locale) })}
          {current.exercise.notes && t('v3Coach', { note: current.exercise.notes })}</p>
      </div>
      {targetForSet(current.exercise, current.setIndex - 1).drop && <span className="self-start rounded-full bg-warn-soft px-stack py-inline text-xs text-warn">{st('drop')}</span>}
      <DropProgress state={state} />
      <div className={current.exercise.superset_group !== null || dropping ? 'glass-strong grid gap-stack rounded-card p-card' : 'grid grid-cols-2 gap-stack'}>
        <WorkoutValue key={`${exerciseId}:${current.setIndex}:${current.dropIndex ?? 0}:weight`} inline={current.exercise.superset_group !== null || dropping} kind="weight" value={state.weight} disabled={blocked || state.bodyweight}
          invalid={state.invalid?.result === 'weight' || state.invalid?.result === 'both'} onChange={state.setWeight} />
        <WorkoutValue key={`${exerciseId}:${current.setIndex}:${current.dropIndex ?? 0}:reps`} inline={current.exercise.superset_group !== null || dropping} kind="reps" value={state.reps} disabled={blocked}
          invalid={state.invalid?.result === 'reps' || state.invalid?.result === 'both'}
          focusInvalid={state.invalid?.result === 'reps' || Boolean(state.bodyweight && state.invalid)} onChange={state.setReps} />
      </div>
      {!dropping && <WorkoutHint last={state.performance} history={history ?? []} weight={state.weight} reps={state.reps} />}
      {historyFailed && <button type="button" className="min-h-12 text-xs text-muted" onClick={() => { setHistoryFailed(false); setAttempt(value => value + 1); }}>{t('tryAgain')}</button>}
      {state.invalid && <p id="set-error" role="alert" className="text-danger">{t(state.invalid.result === 'reps' ? 'enterReps' : 'enterWeightAndReps')}</p>}
      {/* Rest sits in the free space above the bottom button so the whole timer stays on screen. */}
      {state.rest.remaining > 0 && <RestPanel remaining={state.rest.remaining} total={state.rest.total} sound={state.rest.sound} onToggleSound={state.rest.toggleSound}
        flashing={state.rest.flashing} onExtend={state.rest.extend} onSkip={state.rest.skip} />}
      <SupersetCue state={state} next />
      <Button type="button" style={{ fontFamily: 'inherit' }} disabled={blocked} onClick={() => void state.complete()}
        variant={'primary'} block={false} className={"mt-auto flex min-h-[68px] w-full items-center justify-center gap-stack text-xl font-black disabled:opacity-50"}>
        <KoTraining aria-hidden className="size-6" />{dropping ? st('finishDrop') : nextMember && state.next ? st('finishMember', {
          current: supersetTag(state.day.exercises, current.exercise) ?? '', next: supersetTag(state.day.exercises, state.next.exercise) ?? '',
        }) : t(state.progress === state.queue.length ? 'v3CompleteWorkout' : 'v3CompleteSet')}
      </Button>
    </div>
    <SetDots exercise={current.exercise} currentIndex={current.setIndex} doneSets={state.doneSets} onEdit={state.edit} disabled={state.disabled} />
    <details className="rounded-[24px] border border-line-soft bg-surface p-card">
      <summary className="flex min-h-12 cursor-pointer items-center text-muted">{t('v3Details')}</summary>
      <div className="space-y-stack">
        <ExerciseHeader exercise={target} last={state.lastSession} detailsOnly />
        {current.exercise.set_plan && <SetRows state={state} secondary />}
        {!current.exercise.set_plan && <button type="button" aria-pressed={state.bodyweight} disabled={blocked} onClick={() => state.setBodyweight(!state.bodyweight)}
          className="min-h-12 rounded-full border border-line-soft px-page-x text-xs text-muted">{t('bodyweight')}</button>}
      </div>
    </details>
    {!dropping && Boolean(current.exercise.alternatives?.length) && <ExerciseAlternatives exercise={current.exercise} disabled={state.disabled} onChoose={state.switchExercise} />}
    {state.day.warmup?.ramp && <RampLine day={state.day} exercise={current.exercise} bodyweight={state.bodyweight} last={state.lastSession} />}
    {lastSet && <FormCheckButton exerciseId={lastSet.exercise_id} setLogId={lastSet.id} />}
    {state.next && <NextUp exercise={state.next.exercise} />}
  </>;
}

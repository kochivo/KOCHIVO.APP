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
import { messages as v4Messages } from '../v4/messages';
import { SetDots } from './set-dots';
import { parseExerciseVideo } from '@/lib/exercise-video';
import { ExerciseLightbox } from './exercise-lightbox';
import { WorkoutValue } from './workout-value';
import { WorkoutHint } from './workout-hint';
import { RestPanel } from './rest-panel';
import { FocusSetTable } from './focus-set-table';
import { ProgressBar } from '@/ui/progress-bar';
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
import { PainCarried } from './pain-carried';
import styles from './workout-media.module.css';
const ExerciseVideo = dynamic(() => import('./exercise-video').then(module => module.ExerciseVideo));

const FormCheckButton = dynamic(() => import('./form-check-button').then(module => module.FormCheckButton), { ssr: false });

export function WorkoutSet({ state, v4 = false }: { state: ReturnType<typeof useFocusSession>; v4?: boolean }) {
  const t = useT(messages);
  const vt = useT(v4Messages);
  const st = useT(setMessages);
  const locale = useLocale();
  const current = state.current;
  const step = current && `${current.exercise.id}:${current.exercise.exercise_id}:${current.setIndex}:${current.dropIndex ?? 0}`;
  const focusHeading = useCallback((heading: HTMLHeadingElement | null) => { if (step) heading?.focus(); }, [step]);
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
  const number = (value: number) => formatNumber(value, locale);
  const targetReps = target.reps_max === null ? t('toFailure') : target.reps_min === target.reps_max ?
    number(target.reps_min) : t('targetRange', { min: number(target.reps_min), max: number(target.reps_max) });
  const dropping = (current.dropIndex ?? 0) > 0;
  const nextMember = state.next && state.next.exercise.id !== current.exercise.id && current.exercise.superset_group !== null &&
    state.next.exercise.superset_group === current.exercise.superset_group && current.restAfter === 0;
  return <>
    <div className="flex flex-col gap-card-gap">
      <SupersetCue state={state} />
      {!dropping && (parseExerciseVideo(current.exercise.video_url) ? <div className="space-y-stack">
        {showGif && current.exercise.media_path ? <ExerciseLightbox src={exerciseMediaUrl(current.exercise.media_path)} name={name} focus /> :
          <ExerciseVideo key={current.exercise.video_url} url={current.exercise.video_url} name={name} />}
        {current.exercise.media_path && <Button variant="secondary" aria-pressed={showGif} onClick={() => setGifExercise(showGif ? null : exerciseId)}
          className="flex min-h-12 w-full items-center gap-inline text-sm">{t('gifToggle')}<ChevronDown aria-hidden className={`ms-auto size-4 transition-transform ${showGif ? 'rotate-180' : ''}`} /></Button>}
      </div> : current.exercise.media_path ? <ExerciseLightbox src={exerciseMediaUrl(current.exercise.media_path)} name={name} focus /> :
        v4 && <div className={`grid aspect-video place-items-center rounded-card ${styles.placeholder}`} aria-hidden />)}
      <div className="flex flex-col gap-inline">
        <h1 ref={focusHeading} tabIndex={-1} style={{ fontFamily: 'inherit', fontWeight: 900 }} className={v4 ? 'flex items-end justify-between gap-stack text-h' : 'text-2xl leading-normal'}>
          <bdi>{name}</bdi>{v4 && <bdi aria-hidden className="engraved shrink-0 text-stat-wide">{formatNumber(current.setIndex, locale)}</bdi>}
        </h1>
        <p className="text-row text-muted">{t('v3Set', { current: number(current.setIndex), total: number(current.exercise.sets) })}
          {v4 && <> · {vt('targetReps', { reps: targetReps })}{current.restAfter > 0 && <> · {st('rest', { seconds: number(current.restAfter) })}</>}</>}
          {current.exercise.notes && t('v3Coach', { note: current.exercise.notes })}</p>
        {v4 ? <SetDots exercise={current.exercise} currentIndex={current.setIndex} doneSets={state.doneSets}
          onEdit={state.edit} disabled={blocked} compact /> : <ProgressBar thin value={current.setIndex} max={current.exercise.sets}
          aria-label={t('v3Set', { current: formatNumber(current.setIndex, locale), total: formatNumber(current.exercise.sets, locale) })} />}
      </div>
      {!v4 && <PainButton state={state} />}
      <PainCarried state={state} />
      <PainLoadHint hint={current.exercise.pain_hint} today={state.today} weight={state.weight} onSkip={() => void state.skipExercise(current.exercise.id)} />
      <FocusSetTable state={state} v4={v4} />
      {targetForSet(current.exercise, current.setIndex - 1).drop && <span className="self-start rounded-full bg-warn-soft px-stack py-inline text-xs text-warn">{st('drop')}</span>}
      <DropProgress state={state} />
      {!dropping && <WorkoutHint last={state.performance} history={history ?? []} weight={state.weight} reps={state.reps} />}
      {historyFailed && <button type="button" className="min-h-12 text-xs text-muted" onClick={() => { setHistoryFailed(false); setAttempt(value => value + 1); }}>{t('tryAgain')}</button>}
      {state.invalid && <p id="set-error" role="alert" className="text-danger">{t(state.invalid.result === 'reps' ? 'enterReps' : 'enterWeightAndReps')}</p>}
      {/* Rest sits in the free space above the bottom button so the whole timer stays on screen. */}
      {!v4 && state.rest.remaining > 0 && <RestPanel remaining={state.rest.remaining} total={state.rest.total} sound={state.rest.sound} onToggleSound={state.rest.toggleSound}
        flashing={state.rest.flashing} onExtend={state.rest.extend} onSkip={state.rest.skip} />}
      <SupersetCue state={state} next />
      {/* The steppers and the finish button live in one sticky bar at the bottom of the set card,
          so the player logs the set without scrolling on every set. */}
      <div data-action-bar={v4 || undefined} className="glass-strong sticky bottom-page-y z-10 space-y-stack rounded-card border border-line-soft p-card">
        <div className={current.exercise.superset_group !== null || dropping ? 'grid gap-stack' : 'grid grid-cols-2 gap-stack'}>
          <WorkoutValue key={`${exerciseId}:${current.setIndex}:${current.dropIndex ?? 0}:weight`} inline={current.exercise.superset_group !== null || dropping} kind="weight" value={state.weight} disabled={blocked || state.bodyweight}
            invalid={state.invalid?.result === 'weight' || state.invalid?.result === 'both'} draft={state.bodyweight ? undefined : state.typedValues?.weight} onDraft={text => state.setTypedValue('weight', text)} onChange={state.setWeight} />
          <WorkoutValue key={`${exerciseId}:${current.setIndex}:${current.dropIndex ?? 0}:reps`} inline={current.exercise.superset_group !== null || dropping} kind="reps" value={state.reps} disabled={blocked}
            invalid={state.invalid?.result === 'reps' || state.invalid?.result === 'both'}
            focusInvalid={state.invalid?.result === 'reps' || Boolean(state.bodyweight && state.invalid)} draft={state.typedValues?.reps} onDraft={text => state.setTypedValue('reps', text)} onChange={state.setReps} />
        </div>
        <Button type="button" style={{ fontFamily: 'inherit' }} disabled={blocked || state.typedWeightInvalid || state.typedRepsInvalid} onClick={() => void state.complete()}
          variant={state.painCarried?.length ? 'secondary' : 'primary'} block={false} className={v4 ?
            'flex min-h-14 w-full items-center justify-center gap-inline text-md font-bold disabled:opacity-50' :
            'flex min-h-[68px] w-full items-center justify-center gap-stack text-xl font-black disabled:opacity-50'}>
          <KoTraining aria-hidden className="size-6" />{dropping ? st('finishDrop') : nextMember && state.next ? st('finishMember', {
            current: supersetTag(state.day.exercises, current.exercise) ?? '', next: supersetTag(state.day.exercises, state.next.exercise) ?? '',
          }) : v4 && state.progress !== state.queue.length ? vt('doneSet', { set: formatNumber(current.setIndex, locale) }) :
            t(state.progress === state.queue.length ? 'v3CompleteWorkout' : 'v3CompleteSet')}
        </Button>
      </div>
    </div>
    <details className="glass rounded-card p-card">
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

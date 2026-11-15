import { useEffect, useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { GlassCard } from '@/ui/glass-card';
/* eslint-disable no-restricted-imports -- T-288 requires production presentation leaves without data hooks. */
import { SetRowsView } from '@/features/workout/components/set-rows-view';
import { ExerciseHeader } from '@/features/workout/components/exercise-header';
import type { SetRowsState } from '@/features/workout/components/set-rows-view';
import { messages as workoutMessages } from '@/features/workout/messages';
import { messages as v6Messages } from '@/features/workout/v6-messages';
import { messages as alternativeMessages } from '@/features/workout/alternatives/messages';
import { validateSet } from '@/features/workout/set-validation';
/* eslint-enable no-restricted-imports */
import { KoTraining } from '@/ui/icons/ko-training';
import { guidedMessages } from './messages';
import type { PaneProps } from './types';

export function Workout({ state, dispatch, act, now }: PaneProps) {
  const t = useT(guidedMessages), [clock, setClock] = useState(() => now());
  const [bodyweight, setBodyweight] = useState(false), [editing, setEditing] = useState<number | null>(null);
  const [invalid, setInvalid] = useState<SetRowsState['invalid']>(null);
  useEffect(() => {
    if (!state.restUntil) return;
    const timer = setInterval(() => {
      const current = now(); setClock(current);
      if (current >= state.restUntil) clearInterval(timer);
    }, 1000);
    return () => clearInterval(timer);
  }, [state.restUntil, now]);
  const remaining = Math.max(0, Math.ceil((state.restUntil - Math.max(clock, now())) / 1000));
  const ex = t('exercises').split('|');
  const wt = useT(workoutMessages), v6t = useT(v6Messages), at = useT(alternativeMessages), locale = useLocale();
  const rows: SetRowsState = {
    current: { exercise: { id: 'demo-exercise', exercise_id: 'demo-bench', position: 0,
      sets: state.sets.length + 1, reps_min: 8, reps_max: 12, rest_seconds: 90, superset_group: null,
      rpe: null, tempo: '3010', notes: null, name_ar: ex[0] ?? '', name_en: ex[0] ?? '', media_path: null },
      setIndex: editing === null ? state.sets.length + 1 : editing + 1, restAfter: 90 },
    disabled: remaining > 0, doneSets: state.sets.map(([weight_kg, reps], index) => ({
      id: `demo-set-${index}`, program_exercise_id: 'demo-exercise', set_index: index + 1, weight_kg, reps,
      session_id: 'demo-session', exercise_id: 'demo-bench', deleted_at: null,
      completed_at: '2026-11-15T06:00:00Z', client_updated_at: '2026-11-15T06:00:00Z',
    })), invalid, weight: state.kg, reps: state.reps, bodyweight,
    setWeight: kg => dispatch({ type: 'patch', patch: { kg } }),
    setReps: reps => dispatch({ type: 'patch', patch: { reps } }),
    setBodyweight: value => {
      setBodyweight(value);
      if (value) dispatch({ type: 'patch', patch: { kg: 0 } });
    }, complete: async () => {
      const result = validateSet({ weight: state.kg, reps: state.reps, bodyweight });
      if (result !== 'ok') { setInvalid({ key: 'demo', result, attempt: (invalid?.attempt ?? 0) + 1 }); return; }
      setInvalid(null);
      if (editing !== null) { dispatch({ type: 'edit-set', index: editing, kg: bodyweight ? 0 : state.kg, reps: state.reps }); setEditing(null); }
      else act('set');
    }, edit: row => {
      setEditing(row.set_index - 1); setBodyweight(row.weight_kg === 0);
      dispatch({ type: 'patch', patch: { kg: row.weight_kg ?? 0, reps: row.reps ?? 0 } });
    },
    rest: { remaining },
  };
  return <div className="demo-workout grid gap-stack"><header className="flex items-center justify-between gap-inline"><div><p className="text-xs text-muted">{t('day', { n: 2 })}</p><h3 className="text-sm font-semibold">{t('days').split('|')[0]}</h3></div><span className="rounded-full border border-lime/30 p-stack text-micro text-lime">{t('offline')}</span></header>
    <GlassCard className="grid gap-stack p-stack"><h4 className="text-sm font-semibold">{ex[0]}</h4><div aria-hidden className="demo-exercise-preview recessed grid place-items-center rounded-control"><KoTraining className="size-6 text-muted" /></div>
      {rows.current && <ExerciseHeader exercise={rows.current.exercise} last={null} prescriptionOnly />}
      <p className="text-xs text-muted">{t('previous')}</p>
    </GlassCard>
    {remaining > 0 && <div className="glass-strong flex items-center justify-between rounded-control p-stack"><div><small className="text-muted">{t('rest')}</small><b role="timer" className="ms-card text-h tabular-nums" dir="ltr">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</b></div><Button variant="secondary" onClick={() => dispatch({ type: 'patch', patch: { restUntil: 0 } })}>{t('skipRest')}</Button></div>}
    <GlassCard level="strong" data-demo-target="log" className="grid gap-stack p-stack">
      <SetRowsView state={rows} t={wt} v6t={v6t} at={at} locale={locale} v6 source="set" />
    </GlassCard>
    <GlassCard className="grid gap-stack p-stack"><h4>{t('upcoming')}</h4>{[...ex.slice(1, 4), ...state.added].map((name, i) => <p key={i} className="recessed rounded-control p-stack text-row">{name} · {3} × {12}</p>)}</GlassCard>
  </div>;
}

import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { GlassCard } from '@/ui/glass-card';
import { Stepper } from '@/ui/stepper';
import { KoTraining } from '@/ui/icons/ko-training';
import { guidedMessages } from './messages';
import type { PaneProps } from './types';

export function Workout({ state, dispatch, act, now }: PaneProps) {
  const t = useT(guidedMessages), [clock, setClock] = useState(() => now());
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
  return <div className="demo-workout grid gap-stack"><header className="flex items-center justify-between gap-inline"><div><p className="text-xs text-muted">{t('day', { n: 2 })}</p><h3 className="text-sm font-semibold">{t('days').split('|')[0]}</h3></div><span className="rounded-full border border-lime/30 p-stack text-micro text-lime">{t('offline')}</span></header>
    <GlassCard className="grid gap-stack p-stack"><h4 className="text-sm font-semibold">{ex[0]}</h4><div aria-hidden className="demo-exercise-preview recessed grid place-items-center rounded-control"><KoTraining className="size-6 text-muted" /></div>
      <div className="grid">{state.sets.map((set, i) => <div key={i} className="demo-set-row recessed flex items-center justify-between rounded-control text-xs"><span>{i + 1}</span><b>{set.join(' × ')}</b><Check className="size-4 text-lime" aria-hidden /></div>)}</div>
      <p className="text-xs text-muted">{t('previous')}</p>
    </GlassCard>
    {remaining > 0 && <div className="glass-strong flex items-center justify-between rounded-control p-stack"><div><small className="text-muted">{t('rest')}</small><b role="timer" className="ms-4 text-h tabular-nums" dir="ltr">{Math.floor(remaining / 60)}:{String(remaining % 60).padStart(2, '0')}</b></div><Button variant="secondary" onClick={() => dispatch({ type: 'patch', patch: { restUntil: 0 } })}>{t('skipRest')}</Button></div>}
    <GlassCard level="strong" data-demo-target="log" className="grid gap-stack p-stack"><h4 className="text-sm">{t('set', { n: state.sets.length + 1 })}</h4>
      <div className="demo-workout-steppers grid grid-cols-2 gap-inline"><Stepper size="compact" label={t('kg')} value={state.kg} step={2.5} onChange={kg => dispatch({ type: 'patch', patch: { kg } })} />
        <Stepper size="compact" label={t('reps')} value={state.reps} step={1} min={1} onChange={reps => dispatch({ type: 'patch', patch: { reps } })} /></div>
      <Button size="lg" data-demo-source="set" onClick={() => act('set')}>{t('done')}</Button>
    </GlassCard>
    <GlassCard className="grid gap-stack p-stack"><h4>{t('upcoming')}</h4>{[...ex.slice(1, 4), ...state.added].map((name, i) => <p key={i} className="recessed rounded-control p-stack text-row">{name} · {3} × {12}</p>)}</GlassCard>
  </div>;
}

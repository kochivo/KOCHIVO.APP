'use client';
import { NumberInput } from '@/ui/number-input';
import { useCallback, useId, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { uuidv7 } from '@/core/offline/ids';
import { Button } from '@/ui/button';
import { IconButton } from '@/ui/icon-button';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { LoadingState } from '@/ui/loading-state';
import { useToast } from '@/ui/toast';
import { macrosFor } from '@/lib/macros';
import type { Food } from '../../types';
import { currentFoodPlan } from '../../data/library-plan';
import { savePlan } from '../../data/plan-io';
import { assignmentPlayers } from '../v11-assignment';
import { messages } from './v2/messages';
import { messages as baseMessages } from './messages';

export function AddToPlan({ food, initialGrams, onClose }: { food: Food; initialGrams: number; onClose: () => void }) {
  const t = useT(messages), bt = useT(baseMessages), toast = useToast(), title = useId();
  const [player, setPlayer] = useState(''), [meal, setMeal] = useState(''), [grams, setGrams] = useState(initialGrams);
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  const lock = useRef(false);
  const loadPlayers = useCallback(() => assignmentPlayers(), []);
  const players = useResource('v11-assignment-players', loadPlayers);
  const load = useCallback(() => player ? currentFoodPlan(player) : Promise.resolve(null), [player]);
  const plan = useResource(`library-plan:${player}`, load);
  const input = 'min-h-12 w-full rounded-control border border-line bg-surface px-stack';
  const values = macrosFor(food, grams);
  async function save() {
    const draft = plan.data;
    if (lock.current || !draft || !draft.meals.some(row => row.id === meal) || grams <= 0) return;
    lock.current = true; setBusy(true); setError('');
    const next = { ...draft, meals: draft.meals.map(row => row.id === meal ? { ...row, items: [...row.items, { id: uuidv7(), food, grams, position: row.items.length + 1, alternatives: [] }] } : row) };
    try {
      const result = await savePlan(next);
      if (!result.ok) { setError(result.error); return; }
      await plan.mutate(() => next, async () => {});
      toast.success({ title: t('added'), detail: t('addedDetail'), icon: 'meal' }); onClose();
    } catch { setError(bt('error')); }
    finally { lock.current = false; setBusy(false); }
  }
  return <ResponsiveDialog modal fallbackId="new-library-food" onDismiss={() => { if (!busy) onClose(); }} aria-labelledby={title} className="sheet fixed inset-0 z-50 m-auto h-fit max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-card p-card text-ink">
    <header className="flex items-center justify-between gap-stack"><h2 id={title} className="text-title font-bold">{t('add')}</h2><IconButton disabled={busy} aria-label={bt('close')} onClick={onClose}><X aria-hidden /></IconButton></header>
    {(players.status === 'loading' || players.status === 'idle') && <LoadingState variant="list" />}
    {Boolean(players.error) && <div role="alert">{bt('error')}<Button variant="secondary" onClick={() => void players.retry()}>{bt('retry')}</Button></div>}
    {players.status === 'ready' && !players.data?.length && <p className="text-muted">{t('noPlayers')}</p>}
    <fieldset disabled={busy} className="grid gap-card-gap py-page-y"><label className="grid gap-inline">{t('player')}<select className={input} value={player} onChange={event => { setPlayer(event.target.value); setMeal(''); }}><option value="">{t('choose')}</option>{players.data?.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      {player && (plan.status === 'loading' || plan.status === 'idle') && <LoadingState variant="detail" />}
      {Boolean(plan.error) && <div role="alert">{bt('error')}<Button variant="secondary" onClick={() => void plan.retry()}>{bt('retry')}</Button></div>}
      {player && plan.status === 'ready' && !plan.data?.meals.length && <p className="text-muted">{t('noPlan')}</p>}
      {!!plan.data?.meals.length && <label className="grid gap-inline">{t('meal')}<select className={input} value={meal} onChange={event => setMeal(event.target.value)}><option value="">{t('choose')}</option>{plan.data.meals.map(row => <option key={row.id} value={row.id}>{t(row.dayType === 'training' ? 'training' : row.dayType === 'rest' ? 'rest' : 'everyDay')} · {row.name}</option>)}</select></label>}
      <label className="grid gap-inline">{t('grams')}<NumberInput className={input} min={1} max={10000} value={grams} onCommit={value => setGrams(Math.max(1, Math.min(10000, value || 1)))} /></label>
      <section className="glass-strong rounded-control p-card"><h3>{t('preview')} · {food.name}</h3><dl className="grid grid-cols-4 gap-stack">{(['kcal', 'protein', 'carbs', 'fat'] as const).map(key => <div key={key}><dt className="text-xs text-muted">{bt(key)}</dt><dd className="font-display text-title">{Math.round(values[key] * 10) / 10}</dd></div>)}</dl></section>
    </fieldset>{error && <p role="alert" className="text-danger">{error}</p>}
    <footer className="sheet sticky bottom-0 py-stack"><Button disabled={busy || !meal || !plan.data} onClick={() => void save()}>{busy ? bt('saving') : t('add')}</Button></footer>
  </ResponsiveDialog>;
}

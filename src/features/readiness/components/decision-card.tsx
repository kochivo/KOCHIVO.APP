'use client';

import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { applyDecision } from '../data/decisions';
import { reducedSets, suggestDecision } from '../score';
import type { Decision } from '../score';
import { messages } from '../messages';

export function DecisionCard({ playerId, score, exercises, applied, onApplied }: {
  playerId: string; score: number | null; exercises: { sets: number }[]; applied?: Decision;
  onApplied: (decision: Decision) => void;
}) {
  const t = useT(messages);
  const suggestion = suggestDecision(score);
  const [override, setOverride] = useState<Decision | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const selected = override ?? applied ?? suggestion;
  const original = exercises.reduce((total, exercise) => total + exercise.sets, 0);
  const setsFor = (decision: Decision) => decision === 'rest' ? 0 : decision === 'keep' ? original :
    exercises.reduce((total, exercise) => total + reducedSets(exercise.sets), 0);
  const apply = async () => {
    setBusy(true); setError(null);
    try {
      const result = await applyDecision(playerId, selected);
      if (result.ok) onApplied(result.data);
      else setError(result.error);
    } catch { setError(t('saveError')); }
    finally { setBusy(false); }
  };
  return <section className="glass space-y-4 rounded-card p-5">
    <h2>{t('decision')}</h2>
    <p>{t('suggested', { decision: t(suggestion) })}</p>
    <p className="text-muted">{t('sets', { original, suggested: setsFor(suggestion) })}</p>
    <div role="group" aria-label={t('override')} className="flex flex-wrap gap-2">
      {(['keep', 'reduce', 'rest'] as const).map(decision => <button type="button" key={decision} disabled={busy}
        aria-pressed={selected === decision} onClick={() => setOverride(decision)}
        className={`min-h-12 rounded-control border border-line px-3 ${selected === decision ? 'bg-lime text-on-lime' : 'text-muted'}`}>{t(decision)}</button>)}
    </div>
    {selected !== suggestion && <p className="text-muted">{t('sets', { original, suggested: setsFor(selected) })}</p>}
    <button type="button" disabled={busy} onClick={() => void apply()} className="min-h-12 w-full rounded-control bg-lime px-4 font-bold text-on-lime">{t('apply')}</button>
    {applied && <p role="status" className="text-sm text-muted">{t('applied')}</p>}
    {error && <p role="alert" className="text-danger">{error}</p>}
  </section>;
}

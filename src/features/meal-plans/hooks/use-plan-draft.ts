'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { useEffect, useRef, useState } from 'react';
import { loadPlan, savePlan } from '../data/plan-io';
import { activatePlan } from '../data/activate';
import type { PlanDraft } from '../types';
import { useToast } from '@/ui/toast';
import { messages as successMessages } from '../success/messages';
import { formatNumber } from '@/lib/format';
import { planTotals } from '../totals';

export function usePlanDraft(planId: string, { clearErrorsOnEdit = false, initialDraft, save = savePlan, playerName }: {
  clearErrorsOnEdit?: boolean; initialDraft?: PlanDraft; save?: typeof savePlan; playerName?: string;
} = {}) {
  const t = useT(messages);
  const toast = useToast();
  const success = useT(successMessages), locale = useLocale();
  const [draft, setDraft] = useState<PlanDraft | null>(initialDraft ?? null);
  const [saved, setSaved] = useState(initialDraft ? JSON.stringify(initialDraft) : '');
  const latest = useRef(draft);
  const savedSnapshot = useRef(saved);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!initialDraft);
  const [busy, setBusy] = useState(false);
  const running = useRef<Promise<void> | null>(null);
  const [retry, setRetry] = useState(0);
  const [lastActivate, setLastActivate] = useState(false);
  const [lastNotify, setLastNotify] = useState(false);
  const dirty = !!draft && JSON.stringify(draft) !== saved;
  useEffect(() => {
    if (initialDraft) return;
    let current = true;
    loadPlan(planId).then(value => {
      if (current) {
        if (value.ok) { latest.current = value.data; savedSnapshot.current = JSON.stringify(value.data); setDraft(value.data); setSaved(savedSnapshot.current); setError(''); }
        else setError(value.error);
        setLoading(false);
      }
    }).catch(() => { if (current) { setError(t('couldntLoadThePlanTryAgain')); setLoading(false); } });
    return () => { current = false; };
  }, [planId, retry, t, initialDraft]);
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); event.returnValue = ''; };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);
  function update(change: (draft: PlanDraft) => PlanDraft) {
    if (clearErrorsOnEdit) setError('');
    if (latest.current) { latest.current = change(latest.current); setDraft(latest.current); }
  }
  async function persist(activate = false, notify = false) {
    if (!latest.current || busy) return;
    const explicit = activate || notify;
    while (running.current) {
      if (explicit) setBusy(true);
      await running.current;
    }
    const draft = latest.current;
    if (!draft || (!explicit && JSON.stringify(draft) === savedSnapshot.current)) return;
    setLastActivate(activate);
    setLastNotify(notify);
    if (activate && !draft.meals.some(meal => meal.items.length > 0)) {
      setBusy(false); setError(t('addAMealAndFoodFirst')); return;
    }
    if (explicit) setBusy(true);
    setError('');
    const task = (async () => {
    try {
      const result = await save(draft);
      if (!result.ok) { setError(result.error); return; }
      savedSnapshot.current = JSON.stringify(draft); setSaved(savedSnapshot.current);
      if (activate) {
        const activation = await activatePlan(draft.id);
        if (!activation.ok) { setError(activation.error); return; }
        const active = { ...draft, status: 'active' as const };
        latest.current = active; savedSnapshot.current = JSON.stringify(active);
        setDraft(active); setSaved(savedSnapshot.current);
      }
      if (activate || notify) toast.success({ title: success(activate ? playerName ? 'assigned' : 'activated' : 'saved', { name: playerName ?? '' }), detail: success('planDetail', { name: draft.title, calories: formatNumber(Math.round(planTotals(draft).kcal), locale) }), icon: 'meal' });
    } catch { setError(t('couldntSaveTryAgain')); }
    finally { if (explicit) setBusy(false); }
    })();
    running.current = task;
    await task;
    if (running.current === task) running.current = null;
  }
  const persistLatest = useRef(persist);
  useEffect(() => { persistLatest.current = persist; });
  useEffect(() => () => { void persistLatest.current(); }, []);
  return { draft, dirty, error, loading, busy, update, persist, retrySave: () => persist(lastActivate, lastNotify),
    reload: () => { setLoading(true); setRetry(value => value + 1); } };
}

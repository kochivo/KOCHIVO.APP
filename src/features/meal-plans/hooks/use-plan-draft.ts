'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { loadPlan, savePlan } from '../data/plan-io';
import { activatePlan } from '../data/activate';
import type { PlanDraft } from '../types';
import { useToast } from '@/ui/toast';
import { messages as successMessages } from '../success/messages';
import { formatNumber } from '@/lib/format';
import { planTotals } from '../totals';

const pendingDrafts = new Map<string, { draft: PlanDraft; saved: string }>();

export function usePlanDraft(planId: string, { clearErrorsOnEdit = false, initialDraft, save = savePlan, playerName, editor = 'all' }: {
  clearErrorsOnEdit?: boolean; initialDraft?: PlanDraft; save?: typeof savePlan; playerName?: string;
  editor?: 'all' | 'template' | 'none';
} = {}) {
  const router = useRouter();
  const t = useT(messages);
  const toast = useToast();
  const success = useT(successMessages), locale = useLocale();
  const [draft, setDraft] = useState<PlanDraft | null>(() => initialDraft ? pendingDrafts.get(planId)?.draft ?? initialDraft : null);
  const [saved, setSaved] = useState(() => initialDraft ? pendingDrafts.get(planId)?.saved ?? JSON.stringify(initialDraft) : '');
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
        if (value.ok) {
          const recovered = editor === 'none' || (editor === 'template' && value.data.playerId) ? undefined : pendingDrafts.get(planId);
          latest.current = recovered?.draft ?? value.data;
          savedSnapshot.current = recovered?.saved ?? JSON.stringify(value.data);
          setDraft(latest.current); setSaved(savedSnapshot.current); setError('');
        }
        else setError(value.error);
        setLoading(false);
      }
    }).catch(() => { if (current) { setError(t('couldntLoadThePlanTryAgain')); setLoading(false); } });
    return () => { current = false; };
  }, [planId, retry, t, initialDraft, editor]);
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
      if (JSON.stringify(latest.current) === savedSnapshot.current) pendingDrafts.delete(planId);
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
  async function saveBeforeLeaving() {
    await running.current;
    while (latest.current && JSON.stringify(latest.current) !== savedSnapshot.current) {
      const previous = savedSnapshot.current;
      await persist();
      if (previous === savedSnapshot.current) return false;
    }
    return true;
  }
  const actions = useRef({ persist, saveBeforeLeaving });
  const leaving = useRef(false);
  const unsavedMessage = t('leaveWithUnsavedPlan');
  const editing = editor !== 'none' && (editor !== 'template' || !draft?.playerId);
  useEffect(() => { actions.current = { persist, saveBeforeLeaving }; });
  useEffect(() => {
    if (!editing) return;
    if (!/\/captain\/nutrition\/[^/]+\/?$/.test(window.location.pathname)) {
      return () => { void actions.current.persist(); };
    }
    const editorUrl = window.location.href;
    const editorHistoryState: unknown = window.history.state;
    function hasUnsavedChanges() {
      return !!latest.current && JSON.stringify(latest.current) !== savedSnapshot.current;
    }
    function traverse(event: PopStateEvent) {
      if (!hasUnsavedChanges() || window.location.href === editorUrl || window.confirm(unsavedMessage)) return;
      event.stopImmediatePropagation();
      window.history.pushState(editorHistoryState, '', editorUrl);
      void actions.current.persist();
    }
    function follow(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.altKey || event.shiftKey ||
        !(event.target instanceof Element)) return;
      const link = event.target.closest<HTMLAnchorElement>('a[href]');
      if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download') || !latest.current ||
        (!running.current && !hasUnsavedChanges())) return;
      const url = new URL(link.href);
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.search === window.location.search)) return;
      event.preventDefault();
      if (leaving.current) return;
      leaving.current = true;
      void (async () => {
        try {
          if (await actions.current.saveBeforeLeaving()) router.push(url.href);
        } finally { leaving.current = false; }
      })();
    }
    window.addEventListener('popstate', traverse, true);
    document.addEventListener('click', follow, true);
    return () => {
      window.removeEventListener('popstate', traverse, true);
      document.removeEventListener('click', follow, true);
      // History and programmatic navigation can bypass link activation. Recover the draft when reopened.
      if (latest.current && JSON.stringify(latest.current) !== savedSnapshot.current) {
        pendingDrafts.set(planId, { draft: latest.current, saved: savedSnapshot.current });
      }
    };
  }, [planId, router, unsavedMessage, editing]);
  return { draft, dirty, error, loading, busy, update, persist, saveBeforeLeaving, retrySave: () => persist(lastActivate, lastNotify),
    reload: () => { setLoading(true); setRetry(value => value + 1); } };
}

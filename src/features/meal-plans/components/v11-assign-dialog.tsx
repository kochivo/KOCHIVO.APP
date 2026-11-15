'use client';
import { editableFieldClass } from '@/ui/edit-in-place';
import { useCallback, useState } from 'react';
import { useResource } from '@/core/resource';
import { useLocale, useT } from '@/core/i18n/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { Button } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { assignmentPlayers, assignPlan } from './v11-assignment';
import { messages } from './v11/messages';
import { useToast } from '@/ui/toast';
import { messages as successMessages } from '../success/messages';
import { formatNumber } from '@/lib/format';

export function V11AssignDialog({ plans, onClose }: { plans: { id: string; title: string; calories?: number }[]; onClose: () => void }) {
  const t = useT(messages);
  const success = useT(successMessages), toast = useToast(), locale = useLocale();
  const load = useCallback(() => assignmentPlayers(), []);
  const resource = useResource('v11-assignment-players', load);
  const [plan, setPlan] = useState(plans[0]?.id ?? ''), [player, setPlayer] = useState('');
  const [busy, setBusy] = useState(false), [error, setError] = useState('');
  return <ResponsiveDialog modal openerId="v11-assign" fallbackId="v11-assign" aria-label={t('assign')} onDismiss={() => { if (!busy) onClose(); }} className="sheet fixed inset-0 m-auto h-fit max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg overflow-y-auto rounded-card p-card text-ink">
    <h2 className="mb-card-gap font-semibold">{t('assign')}</h2>
    {resource.status === 'loading' || resource.status === 'idle' ? <LoadingState variant="list" /> : resource.error ? <div role="alert">{t('error')}<Button variant="secondary" onClick={() => void resource.retry()}>{t('retry')}</Button></div> : <form className="grid gap-card-gap" onSubmit={event => {
      event.preventDefault(); if (busy) return; setBusy(true); setError('');
      assignPlan(plan, player).then(ok => { if (ok) {
        const selected = plans.find(row => row.id === plan);
        toast.success({ title: success('assigned', { name: resource.data?.find(row => row.id === player)?.name ?? '' }), detail: selected?.calories === undefined ? success('name', { name: selected?.title ?? '' }) : success('planDetail', { name: selected.title, calories: formatNumber(selected.calories, locale) }), icon: 'meal' }); onClose();
      } else setError(t('error')); }).catch(() => setError(t('error'))).finally(() => setBusy(false));
    }}>
      <label className="grid gap-inline">{t('plans')}<select disabled={busy} required value={plan} onChange={event => setPlan(event.target.value)} className={`${editableFieldClass} min-h-12 rounded-control bg-surface px-stack`}>{!plans.length && <option value="">{t('noPlans')}</option>}{plans.map(row => <option key={row.id} value={row.id}>{row.title}</option>)}</select></label>
      <label className="grid gap-inline">{t('player')}<select disabled={busy} required value={player} onChange={event => setPlayer(event.target.value)} className={`${editableFieldClass} min-h-12 rounded-control bg-surface px-stack`}><option value="">{t(resource.data?.length ? 'choosePlayer' : 'noPlayers')}</option>{resource.data?.map(row => <option key={row.id} value={row.id}>{row.name}</option>)}</select></label>
      {error && <p role="alert" className="text-danger">{error}</p>}
      <div className="flex gap-inline"><Button disabled={busy || !plan || !player} type="submit">{t('assign')}</Button><Button variant="secondary" disabled={busy} type="button" onClick={onClose}>{t('close')}</Button></div>
    </form>}
  </ResponsiveDialog>;
}

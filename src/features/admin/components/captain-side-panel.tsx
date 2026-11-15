'use client';
import { useEffect, useRef, useState } from 'react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { messages } from '../dashboard/messages';
import { messages as baseMessages } from '../messages';
import { ActivatePanel } from './activate-panel';
import { CaptainDetailContent } from './captain-detail-content';
import type { CaptainRow, PlanTier } from '../types';
import type { AdminCaptainDetail } from '../dashboard-types';

export type LoadDetail = (captainId: string) => Promise<{ data: AdminCaptainDetail | null; error: string | null }>;
export function CaptainSidePanel({ captain, plans, loadDetail, onClose, onSuccess, onSuspend, activationPending = false, onPendingChange }: {
  captain: CaptainRow; plans: PlanTier[]; loadDetail?: LoadDetail; onClose: () => void;
  onSuccess: (message: string) => void; onSuspend: (captain: CaptainRow) => void;
  activationPending?: boolean; onPendingChange?: (pending: boolean) => void;
}) {
  const t = useT(messages); const b = useT(baseMessages); const ref = useRef<HTMLElement>(null);
  const [result, setResult] = useState<{ data: AdminCaptainDetail | null; error: string | null } | null>(null);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => { ref.current?.focus(); }, [captain.id]);
  useEffect(() => {
    const escape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !event.defaultPrevented && !activationPending && !document.querySelector('dialog[open]')) {
        event.preventDefault(); onClose();
      }
    };
    document.addEventListener('keydown', escape);
    return () => document.removeEventListener('keydown', escape);
  }, [onClose, activationPending]);
  useEffect(() => {
    let active = true;
    if (loadDetail) void Promise.resolve().then(() => loadDetail(captain.id)).then(value => {
      if (active) setResult(value);
    }).catch(() => { if (active) setResult({ data: null, error: t('detailUnavailable') }); });
    return () => { active = false; };
  }, [captain.id, loadDetail, attempt, t]);
  const detail = result?.error ? null : result?.data;
  return <section ref={ref} tabIndex={-1} aria-label={t('detail')} className="glass-strong grid gap-card-gap rounded-card p-card focus-visible:ring-2 focus-visible:ring-lime">
    <header className="flex items-start justify-between gap-inline"><div className="min-w-0"><h2 className="break-words text-title font-semibold">{captain.full_name}</h2>
      <p dir="ltr" className="break-all text-start text-xs text-muted">{captain.email}</p></div><Button variant="secondary" disabled={activationPending} onClick={onClose}>{t('close')}</Button></header>
    {!loadDetail || result && !detail ? <div role="status" className="space-y-stack text-sm text-muted"><p>{result?.error || t('detailUnavailable')}</p>
      {loadDetail && <Button variant="secondary" onClick={() => { setResult(null); setAttempt(n => n + 1); }}>{t('retry')}</Button>}</div>
      : detail ? <CaptainDetailContent captain={captain} detail={detail} section="stats" /> : <LoadingState />}
    <ActivatePanel captain={captain} plans={plans} onClose={onClose} onSuccess={onSuccess} onPendingChange={onPendingChange} embedded />
    <Button variant={captain.suspended ? 'secondary' : 'danger'} disabled={activationPending} onClick={() => onSuspend(captain)}>{b(captain.suspended ? 'restoreAccount' : 'suspendAccount')}</Button>
    {detail && <CaptainDetailContent captain={captain} detail={detail} section="history" />}
  </section>;
}

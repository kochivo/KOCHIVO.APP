'use client';
import { useRef, useState } from 'react';
import { useT } from '@/core/i18n/client';
import { painMessages } from '@/features/workout';
import type { PainReply } from '@/core/offline/pain-tables';
import { Button } from '@/ui/button';
import { messages } from '../pain/messages';
import type { PainAlertReport } from '../data/pain-reports';
import { PainAnswerError } from '../data/pain-reports';

export function PainAlert({ report, now, onAnswer }: { report: PainAlertReport; now: number; onAnswer: (reply: PainReply) => Promise<void> }) {
  const t = useT(messages);
  const pt = useT(painMessages);
  const saving = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<PainAnswerError['key'] | null>(null);
  async function answer(reply: PainReply) {
    if (saving.current) return;
    saving.current = true; setBusy(true); setError(null);
    try { await onAnswer(reply); } catch (error) { setError(error instanceof PainAnswerError ? error.key : 'failed'); }
    finally { saving.current = false; setBusy(false); }
  }
  return <section className="glass-strong space-y-card-gap rounded-card p-card">
    <header className="flex items-center justify-between gap-inline"><h2 className="text-title">{t('title')}</h2>
      <span className="rounded-full bg-danger-soft px-stack py-inline text-xs text-danger">{t('urgent')}</span></header>
    <div className="space-y-stack rounded-control border border-danger/30 bg-danger-soft p-card">
      <h3 className="font-semibold">{report.player_name} · {pt(report.area)}</h3>
      <p className="text-sm">{t('context', { kind: pt(report.kind), severity: report.severity, set: report.set_index ?? '', exercise: report.exercise_name })}</p>
      <p className="text-xs text-muted">{t('minutes', { n: Math.max(0, Math.floor((now - Date.parse(report.created_at)) / 60000)) })}</p>
      {report.repeat_count >= 2 && <p className="text-sm text-muted">{t('repeat')}</p>}
    </div>
    <div className="grid gap-stack">{(['swap_2w', 'reduce_20', 'rest_week', 'talk'] as const).map(reply =>
      <Button variant="secondary" key={reply} disabled={busy} onClick={() => void answer(reply)}>{t(reply)}</Button>)}</div>
    {error && <p role="alert" className="text-danger">{t(error)}</p>}
    <p className="text-xs text-muted">{t('effect')}</p>
  </section>;
}

'use client';
import { Button } from '@/ui/button';
import { useCallback, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useResource } from '@/core/resource';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { AssessmentSchedule } from '@/types/assessment-schedules';
import { assessmentWorkspace, deleteAssessmentSchedule, pauseAssessmentSchedule, saveAssessmentSchedule } from '../data/assessment-actions';
import type { AssessmentInput } from '../assessment-schema';
import { messages } from '../assessments/messages';
import { AssessmentEditor } from './assessment-editor';
import { AssessmentPanel } from './assessment-panel';
import { RequestPicker } from './request-picker';
import { RequestManager } from './request-manager';

export function AssessmentWorkspace({ playerId, formId, locale }: { playerId?: string; formId?: string; locale: Locale }) {
  const router = useRouter();
  const t = createT(messages, locale);
  const load = useCallback(() => assessmentWorkspace(playerId), [playerId]);
  const resource = useResource(`assessment-schedules:${playerId ?? 'all'}`, load);
  const [editing, setEditing] = useState<AssessmentSchedule>();
  const [showEditor, setShowEditor] = useState(true);
  const [manual, setManual] = useState(false), [revision, setRevision] = useState(0);
  const [error, setError] = useState(false), [busy, setBusy] = useState(false);
  const [now] = useState(() => new Date());
  const lock = useRef(false);
  async function save(s: AssessmentInput): Promise<boolean> {
    if (lock.current || !resource.data) return false;
    const previous = resource.data, existing = previous.schedules.find(row => row.id === s.id);
    const row: AssessmentSchedule = { ...s, captain_id: existing?.captain_id ?? '',
      created_at: existing?.created_at ?? now.toISOString(), updated_at: now.toISOString() };
    lock.current = true; setBusy(true);
    try {
      return await resource.mutate(current => ({ ...(current ?? previous), schedules: [
        ...(current ?? previous).schedules.filter(item => item.id !== s.id), row,
      ] }), async () => { await saveAssessmentSchedule(s); });
    } finally { lock.current = false; setBusy(false); }
  }
  async function mutate(s: AssessmentSchedule, remove: boolean) {
    if (lock.current || !resource.data) return;
    const previous = resource.data;
    lock.current = true; setBusy(true); setError(false);
    try {
      const ok = await resource.mutate(current => ({ ...(current ?? previous), schedules: remove
        ? (current ?? previous).schedules.filter(row => row.id !== s.id)
        : (current ?? previous).schedules.map(row => row.id === s.id ? { ...row, paused_at: s.paused_at ? null : now.toISOString() } : row) }),
      () => remove ? deleteAssessmentSchedule(s.id) : pauseAssessmentSchedule(s.id, !s.paused_at));
      if (!ok) setError(true);
      else { if (editing?.id === s.id) { setEditing(undefined); setShowEditor(false); } void resource.retry(); if (formId) router.refresh(); }
    } catch { setError(true); }
    finally { lock.current = false; setBusy(false); }
  }
  if (!resource.data) return <section className="glass rounded-card p-card" role={resource.status === 'error' ? 'alert' : 'status'}>
    <p>{t(resource.status === 'error' ? 'error' : 'loading')}</p>
    {resource.status === 'error' && <Button variant="secondary" className="min-h-12 px-page-x" onClick={() => void resource.retry()}>{t('retry')}</Button>}
  </section>;
  const data = formId ? { ...resource.data, schedules: resource.data.schedules.filter(s => s.form_id === formId) } : resource.data;
  const name = data.players.find(p => p.id === playerId)?.name;
  return <section className="space-y-card-gap">
    {playerId && <h1 className="font-display text-stat font-semibold leading-tight">{t('scheduleFor', { name: name ?? '' })}</h1>}
    {(error || resource.status === 'error') && <p role="alert" className="text-danger">{t('saveError')}
      <Button variant="secondary" className="ms-stack min-h-12 px-stack" onClick={() => void resource.retry()}>{t('retry')}</Button></p>}
    <div className="grid items-start gap-card-gap min-[1001px]:grid-cols-[300px_minmax(0,1fr)]">
      <AssessmentPanel data={data} player={playerId} locale={locale} now={now} busy={busy}
        onEdit={s => { setEditing(s); setShowEditor(true); }} onPause={s => void mutate(s, false)}
        onDelete={s => void mutate(s, true)} onSend={() => setManual(true)} />
      <div className="min-w-0 space-y-card-gap">
        {manual && playerId && <RequestPicker forms={data.forms} playerId={playerId} locale={locale} now={now}
          onCancel={() => setManual(false)} onSent={() => { setManual(false); setRevision(r => r + 1); void resource.retry(); }}
          onSend={async (_row, commit) => { await commit(); return true; }} />}
        {showEditor ? <AssessmentEditor key={editing?.id ?? `new:${revision}`} data={data} player={playerId} formId={formId}
          initial={editing} locale={locale} now={now} onSave={save} onCancel={() => { setShowEditor(false); setEditing(undefined); }}
          onSaved={() => { void resource.retry(); if (formId) router.refresh(); setEditing(undefined); setShowEditor(false); setRevision(r => r + 1); }} />
          : <Button type="submit" variant={'secondary'} block={false} className={"min-h-12 px-page-x"} onClick={() => setShowEditor(true)}>{t('schedule')}</Button>}
      </div>
    </div>
    {playerId && <details className="glass rounded-card border border-line-soft p-card" open={undefined}>
      <summary className="min-h-12 cursor-pointer font-display text-title font-semibold">{t('history')}</summary>
      <RequestManager key={revision} playerId={playerId} locale={locale} />
    </details>}
  </section>;
}

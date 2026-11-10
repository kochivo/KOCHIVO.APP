'use client';

import { useRef, useState } from 'react';
import { localDb } from '@/core/offline';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui';
import { messages } from '../messages';
import { rpeValues, saveSessionFeedback } from '../data/session-feedback';
import { DonePanel } from './done-panel';
import type { WorkoutPointsInput } from '@/features/ranks';

export function SessionFeedback({ sessionId, hasFeedback, workout }: {
  sessionId: string; hasFeedback: boolean; workout?: WorkoutPointsInput;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const [done, setDone] = useState(hasFeedback);
  const [rpe, setRpe] = useState<number | null>(null);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const saving = useRef(false);
  const submit = async () => {
    if (rpe === null || saving.current) return;
    saving.current = true;
    setBusy(true);
    setError(false);
    try {
      await saveSessionFeedback(localDb(), sessionId, { rpe, note }, Date.now());
      setDone(true);
    } catch { setError(true); }
    finally { saving.current = false; setBusy(false); }
  };
  if (done) return <DonePanel workout={workout} />;
  return <section aria-labelledby="session-feedback-title" className="glass-strong space-y-5 rounded-card p-5">
    <h2 id="session-feedback-title" className="text-xl font-bold">{t('feedbackTitle')}</h2>
    <fieldset disabled={busy} className="space-y-3">
      <legend className="pb-3 text-sm text-muted">{t('feedbackRpe')}</legend>
      <div className="grid grid-cols-5 gap-2">{rpeValues.map(value => <button key={value} type="button"
        aria-pressed={rpe === value} onClick={() => setRpe(value)}
        className={`min-h-12 rounded-control border text-xl font-bold ${rpe === value ? 'border-lime bg-lime-soft text-lime' : 'border-line text-ink'}`}>
        {formatNumber(value, locale)}
      </button>)}</div>
      <div className="flex justify-between gap-3 text-xs text-muted"><span>{t('veryEasy')}</span><span>{t('maxEffort')}</span></div>
    </fieldset>
    <label className="block space-y-2"><span className="text-sm">{t('feedbackNote')}</span>
      <textarea value={note} maxLength={500} rows={3} disabled={busy} onChange={event => setNote(event.target.value)}
        className="min-h-24 w-full rounded-control border border-line bg-surface p-3 text-start" />
    </label>
    {error && <p role="alert" className="text-danger">{t('feedbackError')}</p>}
    <div className="flex gap-3">
      <Button disabled={busy || rpe === null} onClick={() => void submit()}>{busy ? t('saving') : t('feedbackSend')}</Button>
      <Button variant="secondary" disabled={busy} onClick={() => setDone(true)}>{t('skip')}</Button>
    </div>
  </section>;
}

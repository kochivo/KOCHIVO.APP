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
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { FinishHero } from './finish-hero';
import { FinishShare } from './finish-share';
import { messages as finishMessages } from '../finish-messages';

export function SessionFeedback({ sessionId, hasFeedback, workout }: {
  sessionId: string; hasFeedback: boolean; workout?: WorkoutPointsInput;
}) {
  const t = useT(messages);
  const ft = useT(finishMessages);
  const v6 = captainWorkspaceEnabled();
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
  if (done) return <>{v6 && <FinishHero sessionId={sessionId} workout={workout} />}<DonePanel workout={workout} />{v6 && <FinishShare />}</>;
  return <section aria-labelledby="session-feedback-title" className={v6 ? 'space-y-5' : 'glass-strong space-y-5 rounded-card p-5'}>
    {v6 && <FinishHero sessionId={sessionId} workout={workout} />}
    <h2 id="session-feedback-title" className="text-xl font-bold">{v6 ? ft('effort') : t('feedbackTitle')}</h2>
    <fieldset disabled={busy} className="space-y-3">
      <legend className="pb-3 text-sm text-muted">{v6 ? ft('effortHint') : t('feedbackRpe')}</legend>
      <div className="grid grid-cols-5 gap-2">{rpeValues.map(value => <button key={value} type="button"
        aria-pressed={rpe === value} onClick={() => setRpe(value)}
        className={`min-h-12 rounded-control border text-xl font-bold ${rpe === value ? 'border-lime bg-lime-soft text-lime' : 'border-line text-ink'}`}>
        {formatNumber(value, locale)}
      </button>)}</div>
      <div className="flex justify-between gap-3 text-xs text-muted"><span>{v6 ? ft('easy') : t('veryEasy')}</span><span>{v6 ? ft('maximum') : t('maxEffort')}</span></div>
    </fieldset>
    <label className="block space-y-2"><span className="text-sm">{t('feedbackNote')}</span>
      <textarea value={note} maxLength={500} rows={3} disabled={busy} onChange={event => setNote(event.target.value)}
        className="min-h-24 w-full rounded-control border border-line bg-surface p-3 text-start" />
    </label>
    {error && <p role="alert" className="text-danger">{t('feedbackError')}</p>}
    <div className={v6 ? 'flex flex-col gap-2' : 'flex gap-3'}>
      <Button className={v6 ? 'min-h-12 flex-1 rounded-full' : undefined} disabled={busy || rpe === null} onClick={() => void submit()}>{busy ? t('saving') : v6 ? ft('send') : t('feedbackSend')}</Button>
      {v6 && <FinishShare />}
      <Button variant="secondary" className={v6 ? 'min-h-12 rounded-full' : undefined} disabled={busy} onClick={() => setDone(true)}>{t('skip')}</Button>
    </div>
  </section>;
}

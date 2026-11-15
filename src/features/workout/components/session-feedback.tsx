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
import { effortChoices } from './workout-v3-model';

export function SessionFeedback({ sessionId, hasFeedback, workout }: {
  sessionId: string; hasFeedback: boolean; workout?: WorkoutPointsInput;
}) {
  const t = useT(messages);
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
  if (done) return <>{v6 && <FinishHero sessionId={sessionId} workout={workout} />}<DonePanel workout={workout} />{v6 && <><FinishShare /><FinishHero sessionId={sessionId} workout={workout} extras /></>}</>;
  if (v6) return <section aria-label={t('v3Done')} className="space-y-3.5">
    <div className="flex min-h-[calc(100dvh-40px)] flex-col gap-3.5">
    <FinishHero sessionId={sessionId} workout={workout} />
    <fieldset disabled={busy} className="flex flex-col gap-2 border-0 p-0">
      <legend className="pb-2 text-sm font-bold">{t('v3Effort')}</legend>
      <div className="grid grid-cols-3 gap-2">{effortChoices.map(choice => <button key={choice.value} type="button" style={{ fontFamily: 'inherit' }}
        aria-pressed={rpe === choice.value} onClick={() => setRpe(choice.value)}
        className={`min-h-[52px] rounded-full border text-sm ${rpe === choice.value ? 'border-ink bg-ink font-extrabold text-on-lime' : 'border-line-soft text-ink'}`}>{t(choice.key)}</button>)}</div>
    </fieldset>
    <label className="flex flex-col gap-1.5 text-[13px] text-muted">{t('v3Note')}
      <textarea value={note} placeholder={t('v3NotePlaceholder')} maxLength={500} rows={1} disabled={busy}
        onChange={event => setNote(event.target.value)} className="min-h-[52px] w-full resize-y rounded-[18px] border border-line-soft bg-surface px-3.5 py-3 text-start text-sm text-ink" />
    </label>
    {error && <p role="alert" className="text-danger">{t('feedbackError')}</p>}
    <div className="mt-auto flex flex-col gap-2 pt-1">
      <Button type="button" style={{ fontFamily: 'inherit' }} disabled={busy || rpe === null} onClick={() => void submit()}
        variant={'primary'} block={false} className={"flex min-h-16 w-full items-center justify-center text-[19px] font-black disabled:opacity-50"}>{busy ? t('saving') : t('v3Send')}</Button>
      <FinishShare />
    </div>
    </div>
    <Button variant="secondary" className="min-h-12 rounded-full" disabled={busy} onClick={() => setDone(true)}>{t('skip')}</Button>
    <FinishHero sessionId={sessionId} workout={workout} extras />
  </section>;
  return <section aria-labelledby="session-feedback-title" className={v6 ? 'space-y-5' : 'glass-strong space-y-5 rounded-card p-5'}>
    {v6 && <FinishHero sessionId={sessionId} workout={workout} />}
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
    <div className={v6 ? 'flex flex-col gap-2' : 'flex gap-3'}>
      <Button className={v6 ? 'min-h-12 flex-1 rounded-full' : undefined} disabled={busy || rpe === null} onClick={() => void submit()}>{busy ? t('saving') : t('feedbackSend')}</Button>
      {v6 && <FinishShare />}
      <Button variant="secondary" className={v6 ? 'min-h-12 rounded-full' : undefined} disabled={busy} onClick={() => setDone(true)}>{t('skip')}</Button>
    </div>
  </section>;
}

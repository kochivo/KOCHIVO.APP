'use client';

import { useRef, useState } from 'react';
import { localDb } from '@/core/offline';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button } from '@/ui';
import { buttonClass } from '@/ui/button';
import Link from 'next/link';
import { messages } from '../messages';
import { rpeValues, saveSessionFeedback } from '../data/session-feedback';
import { DonePanel } from './done-panel';
import type { WorkoutPointsInput } from '@/features/ranks';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { FinishHero } from './finish-hero';
import { FinishShare } from './finish-share';
import { effortChoices } from './workout-v3-model';
import { messages as v4Messages } from '../v4/messages';

export function SessionFeedback({ sessionId, hasFeedback, workout, onSavedHome, onBack }: {
  sessionId: string; hasFeedback: boolean; workout?: WorkoutPointsInput; onSavedHome?: () => void; onBack?: () => void;
}) {
  const t = useT(messages);
  const vt = useT(v4Messages);
  const v4 = onSavedHome !== undefined;
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
      (onBack ?? onSavedHome)?.();
    } catch { setError(true); }
    finally { saving.current = false; setBusy(false); }
  };
  if (v4) return <section aria-label={t('v3Done')} className="flex min-h-[calc(100dvh-5rem)] flex-col gap-card-gap">
    <FinishHero sessionId={sessionId} workout={workout} v4 />
    {!done && <>
      <fieldset disabled={busy} className="space-y-inline">
        <legend className="pb-inline text-sm font-bold">{t('v3Effort')}</legend>
        <div className="grid grid-cols-3 gap-inline">{effortChoices.map(choice => <Button key={choice.value} type="button"
          size="lg" variant="secondary" aria-pressed={rpe === choice.value} onClick={() => setRpe(choice.value)}
          className={rpe === choice.value ? 'border-lime bg-lime-soft px-inline text-lime' : 'px-inline'}>{t(choice.key)}</Button>)}</div>
      </fieldset>
      <textarea aria-label={t('v3Note')} value={note} placeholder={t('v3NotePlaceholder')} maxLength={500} rows={1} disabled={busy}
        onChange={event => setNote(event.target.value)} className="min-h-12 w-full resize-y rounded-control border border-line-soft bg-surface px-card py-stack text-start text-sm text-ink" />
      {error && <p role="alert" className="text-danger">{t('feedbackError')}</p>}
    </>}
    <FinishShare />
    <FinishHero sessionId={sessionId} workout={workout} extras />
    <div className="mt-auto">
      {done || (rpe === null && !note.trim()) ? (onBack ? <Button size="lg" block onClick={onBack}>{t('cachedWorkouts')}</Button> : <Link href="/player" className={buttonClass({ size: 'lg', block: true })}>{t('backToHome')}</Link>) :
        <Button block size="lg" disabled={busy || rpe === null} onClick={() => void submit()}>{busy ? t('saving') : vt('saveHome')}</Button>}
    </div>
  </section>;
  if (done) return <>{v6 && <FinishHero sessionId={sessionId} workout={workout} />}<DonePanel workout={workout} sessionId={sessionId} onBack={onBack} />{v6 && <><FinishShare /><FinishHero sessionId={sessionId} workout={workout} extras /></>}</>;
  if (v6) return <section aria-label={t('v3Done')} className="space-y-card-gap">
    <div className="flex min-h-[calc(100dvh-40px)] flex-col gap-card-gap">
    <FinishHero sessionId={sessionId} workout={workout} />
    <fieldset disabled={busy} className="flex flex-col gap-inline border-0 p-0">
      <legend className="pb-inline text-sm font-bold">{t('v3Effort')}</legend>
      <div className="grid grid-cols-3 gap-inline">{effortChoices.map(choice => <button key={choice.value} type="button" style={{ fontFamily: 'inherit' }}
        aria-pressed={rpe === choice.value} onClick={() => setRpe(choice.value)}
        className={`min-h-[52px] rounded-full border text-sm ${rpe === choice.value ? 'border-ink bg-ink font-extrabold text-on-lime' : 'border-line-soft text-ink'}`}>{t(choice.key)}</button>)}</div>
    </fieldset>
    <label className="flex flex-col gap-inline text-row text-muted">{t('v3Note')}
      <textarea value={note} placeholder={t('v3NotePlaceholder')} maxLength={500} rows={1} disabled={busy}
        onChange={event => setNote(event.target.value)} className="min-h-[52px] w-full resize-y rounded-[18px] border border-line-soft bg-surface px-card py-stack text-start text-sm text-ink" />
    </label>
    {error && <p role="alert" className="text-danger">{t('feedbackError')}</p>}
    <div className="mt-auto flex flex-col gap-inline pt-inline">
      <Button type="button" style={{ fontFamily: 'inherit' }} disabled={busy || rpe === null} onClick={() => void submit()}
        variant={'primary'} block={false} className={"flex min-h-16 w-full items-center justify-center text-title font-black disabled:opacity-50"}>{busy ? t('saving') : t('v3Send')}</Button>
      <FinishShare />
    </div>
    </div>
    <Button variant="secondary" className="min-h-12 rounded-full" disabled={busy} onClick={() => setDone(true)}>{t('skip')}</Button>
    <FinishHero sessionId={sessionId} workout={workout} extras />
  </section>;
  return <section aria-labelledby="session-feedback-title" className={v6 ? 'space-y-card-gap' : 'glass-strong space-y-card-gap rounded-card p-card'}>
    {v6 && <FinishHero sessionId={sessionId} workout={workout} />}
    <h2 id="session-feedback-title" className="text-xl font-bold">{t('feedbackTitle')}</h2>
    <fieldset disabled={busy} className="space-y-stack">
      <legend className="pb-stack text-sm text-muted">{t('feedbackRpe')}</legend>
      <div className="grid grid-cols-5 gap-inline">{rpeValues.map(value => <button key={value} type="button"
        aria-pressed={rpe === value} onClick={() => setRpe(value)}
        className={`min-h-12 rounded-control border text-xl font-bold ${rpe === value ? 'border-lime bg-lime-soft text-lime' : 'border-line text-ink'}`}>
        {formatNumber(value, locale)}
      </button>)}</div>
      <div className="flex justify-between gap-stack text-xs text-muted"><span>{t('veryEasy')}</span><span>{t('maxEffort')}</span></div>
    </fieldset>
    <label className="block space-y-inline"><span className="text-sm">{t('feedbackNote')}</span>
      <textarea value={note} maxLength={500} rows={3} disabled={busy} onChange={event => setNote(event.target.value)}
        className="min-h-24 w-full rounded-control border border-line bg-surface p-stack text-start" />
    </label>
    {error && <p role="alert" className="text-danger">{t('feedbackError')}</p>}
    <div className={v6 ? 'flex flex-col gap-inline' : 'flex gap-stack'}>
      <Button className={v6 ? 'min-h-12 flex-1 rounded-full' : undefined} disabled={busy || rpe === null} onClick={() => void submit()}>{busy ? t('saving') : t('feedbackSend')}</Button>
      {v6 && <FinishShare />}
      <Button variant="secondary" className={v6 ? 'min-h-12 rounded-full' : undefined} disabled={busy} onClick={() => setDone(true)}>{t('skip')}</Button>
    </div>
  </section>;
}

'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useT } from '@/core/i18n/client';
import { useCaptainContext } from '@/features/player-shell';
import { Button, ErrorState, LoadingState, ProgressBar } from '@/ui';
import { useIntakeDraft } from '../hooks/use-intake-draft';
import { makeIntakeSchema } from '../data/intake-schema';
import { saveIntake } from '../data/save-intake';
import { completeIntake, toPayload } from '../wizard';
import type { CompletionStage } from '../wizard';
import type { IntakeDraft } from '../wizard';
import { questions, optionalQuestions, questionValid } from '../v6-steps';
import { messages } from '../messages';
import { messages as v6Messages } from '../v6-messages';
import { IntakeQuestion } from './intake-question';

const IntakeMoment = dynamic(() => import('./intake-moment').then(module => module.IntakeMoment));

export function IntakeV6({ statusError }: { statusError?: string }) {
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const captain = useCaptainContext();
  const router = useRouter();
  const { draft, update, clear, ready } = useIntakeDraft();
  const [index, setIndex] = useState(0);
  const [stage, setStage] = useState<'welcome' | 'steps' | CompletionStage>('welcome');
  const [now] = useState(() => new Date());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const field = questions[index] ?? 'full_name';
  const valid = questionValid(field, draft, now);
  async function next(candidate: IntakeDraft = draft) {
    if (lock.current || !questionValid(field, candidate, now)) return;
    if (index < questions.length - 1) { setIndex(index + 1); setError(''); return; }
    const invalid = questions.findIndex(question => !questionValid(question, candidate, now));
    if (invalid >= 0) { setIndex(invalid); setError(t('reviewYourAnswersBeforeSending')); return; }
    if (!navigator.onLine) { setError(t('youreOfflineYourAnswersAreSavedSend')); return; }
    const parsed = makeIntakeSchema(now).intakeSchema.safeParse(candidate);
    if (!parsed.success) { setError(t('reviewYourAnswersBeforeSending')); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      const result = await completeIntake(() => saveIntake(toPayload(parsed.data)), setStage, () => {
        clear(); router.replace('/player'); router.refresh();
      }, ms => new Promise(resolve => window.setTimeout(resolve, ms)));
      if (result.error) setError(result.error);
    } catch { setError(t('couldntSendYourAnswersTryAgain')); }
    finally { lock.current = false; setBusy(false); }
  }
  if (statusError) return <ErrorState message={statusError} retryLabel={t('tryAgain')} onRetry={() => router.refresh()} />;
  if (!ready) return <LoadingState aria-label={t('loadingYourAnswers')} />;
  if (stage !== 'steps') return <IntakeMoment stage={stage} captainName={captain.data?.fullName} onStart={() => setStage('steps')} />;
  const progress = v6t('progress', { n: index + 1, total: questions.length });
  return <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-5 px-5 py-6">
    <header className="space-y-3"><div className="flex items-center justify-between text-xs text-faint">
      <span aria-live="polite">{progress}</span>
      {optionalQuestions.includes(field) && <Button variant="secondary" type="button" disabled={busy} className="min-h-12 px-3" onClick={() => {
        update({ [field]: field === 'target_weight_kg' ? null : field === 'notes' ? '' : [] });
        if (index < questions.length - 1) setIndex(index + 1);
        else void next({ ...draft, notes: '' });
      }}>{v6t('skip')}</Button>}</div>
      <ProgressBar value={index + 1} max={questions.length} aria-label={progress} /></header>
    <fieldset disabled={busy} className="min-w-0 flex-1"><IntakeQuestion key={field} field={field} draft={draft} update={patch => { update(patch); setError(''); }} year={now.getUTCFullYear()} /></fieldset>
    <p className="text-xs text-muted">{t('onlyYourCoachCanSeeYourAnswers')}</p>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    <footer className="space-y-2"><Button className="min-h-12 w-full rounded-full" disabled={busy || !valid} onClick={() => void next()}>
      {busy ? t('sendingYourAnswers') : index === questions.length - 1 ? t('sendToCoach') : t('next')}</Button>
      <Button variant="secondary" className="min-h-12 w-full rounded-full" disabled={busy} onClick={() => index ? setIndex(index - 1) : setStage('welcome')}>{t('back')}</Button></footer>
  </main>;
}

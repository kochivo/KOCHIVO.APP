'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { formatNumber } from '@/lib/format';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { useCaptainContext } from '@/features/player-shell';
import { Button, ErrorState, LoadingState, ProgressBar } from '@/ui';
import { makeIntakeSchema } from '../data/intake-schema';
import type { Intake } from '../data/intake-schema';
import { saveIntake } from '../data/save-intake';
import { useIntakeDraft } from '../hooks/use-intake-draft';
import { canAdvance, completeIntake, progress, stepOrder, toPayload } from '../wizard';
import type { CompletionStage, IntakeDraft } from '../wizard';
import { StepBasics } from './step-basics';
import { StepSchedule } from './step-schedule';
import { StepHealth } from './step-health';
import { StepFood } from './step-food';

const screens = { basics: StepBasics, schedule: StepSchedule, health: StepHealth, food: StepFood };
const IntakeMoment = dynamic(() => import('./intake-moment').then(module => module.IntakeMoment), {
  loading: MomentLoading,
});

function MomentLoading() {
  const t = useT(messages);
  return <LoadingState aria-label={t('loadingYourDetails')} />;
}

export function IntakeWizard({ statusError }: { statusError?: string }) {
  const t = useT(messages);
  const locale = useLocale();
  const captain = useCaptainContext();
  const [stage, setStage] = useState<'welcome' | 'steps' | CompletionStage>('welcome');
  const offlineMessage = t('youreOfflineYourAnswersAreSavedSend');
  const titles = [t('letsGetToKnowYou'), t('yourWeeklySchedule'), t('yourHealth'), t('food')];
  const { draft, update, clear, ready } = useIntakeDraft();
  const [index, setIndex] = useState(0);
  const [now] = useState(() => new Date());
  const [touched, setTouched] = useState<Partial<Record<keyof Intake, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const fields = useRef<HTMLFieldSetElement>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  const step = stepOrder[index] ?? 'basics';
  const Screen = screens[step];
  const validation = makeIntakeSchema(now, t).stepSchemas[step].safeParse(draft);
  const errors: Partial<Record<keyof Intake, string>> = {};
  if (!validation.success) {
    for (const issue of validation.error.issues) {
      const field = issue.path[0] as keyof Intake;
      if (touched[field] && !errors[field]) {
        errors[field] = draft[field] === undefined && (field === 'birth_year' || field === 'height_cm' || field === 'weight_kg')
          ? t('confirmOrChangeMeasurement') : issue.message;
      }
    }
  }

  useEffect(() => {
    const sync = () => setOffline(!navigator.onLine);
    sync();
    window.addEventListener('online', sync);
    window.addEventListener('offline', sync);
    return () => {
      window.removeEventListener('online', sync);
      window.removeEventListener('offline', sync);
    };
  }, []);

  useEffect(() => { heading.current?.focus(); }, [index, ready, stage]);

  function touch(field: keyof Intake) {
    setTouched((previous) => ({ ...previous, [field]: true }));
  }
  function change(patch: IntakeDraft) {
    update(patch);
    setTouched((previous) => ({ ...previous, ...Object.fromEntries(Object.keys(patch).map((key) => [key, true])) }));
    setError('');
  }
  async function next() {
    if (submitting.current) return;
    if (!validation.success) {
      const invalid = validation.error.issues.map(issue => String(issue.path[0]));
      setTouched(previous => ({ ...previous, ...Object.fromEntries(invalid.map(field => [field, true])) }));
      const field = Array.from(fields.current?.querySelectorAll<HTMLElement>('[data-intake-field]') ?? [])
        .find(node => invalid.includes(node.dataset.intakeField ?? ''));
      (field?.matches('input') ? field : field?.querySelector('input') ?? field?.querySelector('button:not(:disabled)'))?.focus();
      return;
    }
    if (index < stepOrder.length - 1) { setIndex(index + 1); return; }
    if (!navigator.onLine) { setOffline(true); return; }
    for (const candidate of stepOrder) {
      if (!canAdvance(candidate, draft, now)) {
        setIndex(stepOrder.indexOf(candidate));
        setError(t('reviewYourAnswersBeforeSending'));
        return;
      }
    }
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await completeIntake(() => saveIntake(toPayload(draft)), setStage, () => {
        clear();
        router.replace('/player');
        router.refresh();
      }, milliseconds => new Promise(resolve => window.setTimeout(resolve, milliseconds)));
      if (result.error) { setError(result.error); return; }
    } catch {
      setError(navigator.onLine ? t('couldntSendYourAnswersTryAgain') : offlineMessage);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (statusError) return <ErrorState message={statusError} retryLabel={t('tryAgain')} onRetry={() => router.refresh()} />;
  if (!ready) return <LoadingState aria-label={t('loadingYourAnswers')} />;
  if (stage !== 'steps') return <IntakeMoment stage={stage} captainName={captain.data?.fullName} onStart={() => setStage('steps')} />;
  return (
    <main className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-section px-page-x pt-section text-start">
      <header key={`heading-${step}`} className="enter space-y-stack motion-reduce:animate-none">
        <div className="flex flex-wrap justify-between gap-inline text-xs text-muted">
          <span>{t('stepProgress', { value0: formatNumber(index + 1, locale) })}</span>
          <span>{t('onlyYourCoachCanSeeYourAnswers')}</span>
        </div>
        <ProgressBar value={progress(step)} max={100} aria-label={t('stepProgress', { value0: formatNumber(index + 1, locale) })} />
        <h1 ref={heading} tabIndex={-1} className="text-3xl font-extrabold outline-none">{titles[index]}</h1>
      </header>
      <fieldset ref={fields} key={step} disabled={busy} className="enter min-w-0 flex-1 motion-reduce:animate-none">
        <legend className="sr-only">{titles[index]}</legend>
        <Screen draft={draft} update={change} errors={errors} touch={touch} />
      </fieldset>
      <footer className="glass-strong sticky bottom-0 space-y-stack rounded-t-card p-card pb-[max(1rem,env(safe-area-inset-bottom))]">
        {offline && <p role="status" className="text-sm text-muted">{offlineMessage}</p>}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex gap-stack">
          <Button variant="ghost" size="lg" className="min-h-12" disabled={busy}
            onClick={() => index === 0 ? setStage('welcome') : setIndex(index - 1)}>{t('back')}</Button>
          <Button size="lg" className="min-h-12 flex-1" disabled={busy}
            aria-busy={busy} onClick={next}>{busy ? t('sendingYourAnswers') : index === stepOrder.length - 1 ? t('sendToCoach') : t('next')}</Button>
        </div>
      </footer>
    </main>
  );
}

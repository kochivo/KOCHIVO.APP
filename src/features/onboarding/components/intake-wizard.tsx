'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button, ErrorState, LoadingState, ProgressBar } from '@/ui';
import { makeIntakeSchema } from '../data/intake-schema';
import type { Intake } from '../data/intake-schema';
import { saveIntake } from '../data/save-intake';
import { useIntakeDraft } from '../hooks/use-intake-draft';
import { canAdvance, progress, stepOrder, toPayload } from '../wizard';
import type { IntakeDraft } from '../wizard';
import { StepBasics } from './step-basics';
import { StepSchedule } from './step-schedule';
import { StepHealth } from './step-health';
import { StepFood } from './step-food';

const titles = ['نعرفك الأول', 'وقتك في الأسبوع', 'صحتك', 'الأكل'];
const screens = [StepBasics, StepSchedule, StepHealth, StepFood];
const offlineMessage = 'مفيش نت. إجاباتك محفوظة، ابعتها لما النت يرجع';

export function IntakeWizard({ statusError }: { statusError?: string }) {
  const { draft, update, clear, ready } = useIntakeDraft();
  const [index, setIndex] = useState(0);
  const [now] = useState(() => new Date());
  const [touched, setTouched] = useState<Partial<Record<keyof Intake, boolean>>>({});
  const [busy, setBusy] = useState(false);
  const [offline, setOffline] = useState(false);
  const [error, setError] = useState('');
  const submitting = useRef(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const router = useRouter();
  const step = stepOrder[index] ?? 'basics';
  const Screen = screens[index] ?? StepBasics;
  const validation = makeIntakeSchema(now).stepSchemas[step].safeParse(draft);
  const errors: Partial<Record<keyof Intake, string>> = {};
  if (!validation.success) {
    for (const issue of validation.error.issues) {
      const field = issue.path[0] as keyof Intake;
      if (touched[field] && !errors[field]) errors[field] = issue.message;
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

  useEffect(() => { heading.current?.focus(); }, [index, ready]);

  function touch(field: keyof Intake) {
    setTouched((previous) => ({ ...previous, [field]: true }));
  }
  function change(patch: IntakeDraft) {
    update(patch);
    setTouched((previous) => ({ ...previous, ...Object.fromEntries(Object.keys(patch).map((key) => [key, true])) }));
    setError('');
  }
  async function next() {
    if (submitting.current || !canAdvance(step, draft, now)) return;
    if (index < stepOrder.length - 1) { setIndex(index + 1); return; }
    if (!navigator.onLine) { setOffline(true); return; }
    for (const candidate of stepOrder) {
      if (!canAdvance(candidate, draft, now)) {
        setIndex(stepOrder.indexOf(candidate));
        setError('راجع إجاباتك قبل ما تبعتها');
        return;
      }
    }
    submitting.current = true;
    setBusy(true);
    setError('');
    try {
      const result = await saveIntake(toPayload(draft));
      if (result.error) { setError(result.error); return; }
      clear();
      router.replace('/player');
      router.refresh();
    } catch {
      setError(navigator.onLine ? 'مش قادرين نبعت إجاباتك. جرّب تاني' : offlineMessage);
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (statusError) return <ErrorState message={statusError} retryLabel="جرّب تاني" onRetry={() => router.refresh()} />;
  if (!ready) return <LoadingState aria-label="بنحمّل إجاباتك" />;
  return (
    <main dir="rtl" className="mx-auto flex min-h-dvh w-full max-w-lg flex-col gap-6 px-5 pt-6 text-start">
      <header className="space-y-3">
        <div className="flex flex-wrap justify-between gap-2 text-xs text-muted">
          <span>خطوة {index + 1} من 4</span>
          <span>بياناتك بتروح للكابتن بتاعك بس</span>
        </div>
        <ProgressBar value={progress(step)} max={100} aria-label={`خطوة ${index + 1} من 4`} />
        <h1 ref={heading} tabIndex={-1} className="text-3xl font-extrabold outline-none">{titles[index]}</h1>
      </header>
      <fieldset disabled={busy} className="min-w-0 flex-1">
        <legend className="sr-only">{titles[index]}</legend>
        <Screen draft={draft} update={change} errors={errors} touch={touch} />
      </fieldset>
      <footer className="glass-strong sticky bottom-0 space-y-3 rounded-t-card p-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        {offline && <p role="status" className="text-sm text-muted">{offlineMessage}</p>}
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}
        <div className="flex gap-3">
          <Button variant="ghost" size="lg" disabled={index === 0 || busy} onClick={() => setIndex(index - 1)}>رجوع</Button>
          <Button size="lg" className="flex-1" disabled={busy || !canAdvance(step, draft, now)}
            aria-busy={busy} onClick={next}>{busy ? 'بنبعت إجاباتك…' : index === 3 ? 'ابعت للكابتن' : 'التالي'}</Button>
        </div>
      </footer>
    </main>
  );
}

'use client';
import { cn } from '@/lib/cn';
import { useState } from 'react';
import { localDb } from '@/core/offline';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../pain/messages';
import { exerciseName } from '@/lib/display-name';
import type { PainReportRow } from '@/core/offline/pain-tables';
import type { useFocusSession } from '../hooks/use-focus-session';
import { startSession } from '../data/log-set';
import { savePain } from '../data/save-pain';
import { painAffects, safePainSwap } from '../pain-safe-swap';
import { PainSheet } from './pain-sheet';
import type { PainInput } from './pain-sheet';
import { PainAfterSend } from './pain-after-send';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { usePainSkipNotice } from '../hooks/use-pain-skip-notice';
import { alternativeStep } from '../data/exercise-choices';
import { describePainQueue } from '../pain-stop';
import { PainScreenHeader } from './pain-screen-header';

export function PainFlow({ state, onClose, v4 = false }: { state: ReturnType<typeof useFocusSession>; onClose: () => void; v4?: boolean }) {
  const locale = useLocale();
  const t = useT(messages);
  const notifySkipped = usePainSkipNotice();
  const [report, setReport] = useState<PainReportRow | null>(null);
  const current = state.current;
  if (!current || !state.day) return null;
  const exercise = exerciseName(current.exercise, locale);
  async function send(input: PainInput) {
    if (!current || !state.day || !state.captainId) throw new Error('Missing workout owner');
    const now = Date.now();
    const session = state.session ?? await startSession(localDb(), state.day, state.today, now);
    setReport(await savePain(localDb(), { ...input, captain_id: state.captainId, session_id: session.id,
      program_exercise_id: current.exercise.id, exercise_id: current.exercise.exercise_id, set_index: current.setIndex }, now));
  }
  if (!report) return <PainSheet onClose={onClose} onSend={send} exercise={exercise} v4={v4} />;
  const metadata = current.exercise.alternative_exercises?.find(row => row.id === current.exercise.exercise_id) ?? current.exercise;
  const affected = report.severity === 5 || report.kind === 'sharp' || painAffects(report.area, metadata);
  const alternative = (current.dropIndex ?? 0) === 0 ? safePainSwap(report.area,
    (current.exercise.alternative_exercises ?? []).filter(row => row.id !== current.exercise.exercise_id), current.exercise.pattern, state.painReports) : undefined;
  const title = affected ? t('stopped', { exercise }) : t('continueWorkout');
  const queue = v4 ? describePainQueue(state.remainingForPain(), state.remainingForPain(report), new Map(state.queue.map(step => {
    const effective = alternativeStep(step, state.selectedExercises[step.exercise.id]) ?? step;
    return [step.exercise.id, exerciseName(effective.exercise, locale)];
  }))) : undefined;
  return <ResponsiveDialog modal fallbackId="pain-button" aria-label={title} onDismiss={onClose}
    className={cn('sheet m-auto w-full max-w-lg overflow-y-auto text-ink', v4 ? 'fixed inset-0 h-dvh max-h-dvh p-page-x' : 'fixed inset-x-0 bottom-0 max-h-[90dvh] rounded-card p-card')}>
    {v4 && <PainScreenHeader title={title} subtitle={`${t(report.area)} · ${t(report.kind)}`} onClose={onClose} />}
    <PainAfterSend report={report} exercise={exercise} affected={affected} onContinue={onClose}
      queue={queue}
      alternative={alternative ? exerciseName(alternative, locale) : undefined}
      onSwap={() => { if (alternative) { state.switchExercise(alternative.id); onClose(); } }}
      onStop={() => { void state.skipForPain(); onClose(); }}
      onSkip={() => {
        if (affected) void state.skipForPain(report).then(count => notifySkipped(count, report));
        else void state.skipExercise(current.exercise.id);
        onClose();
      }} />
  </ResponsiveDialog>;
}

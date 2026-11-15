'use client';
import { useState } from 'react';
import { localDb } from '@/core/offline';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../pain/messages';
import { exerciseName } from '@/lib/display-name';
import type { PainReportRow } from '@/core/offline/pain-tables';
import type { useFocusSession } from '../hooks/use-focus-session';
import { startSession } from '../data/log-set';
import { savePain } from '../data/save-pain';
import { safePainSwap } from '../pain-safe-swap';
import { PainSheet } from './pain-sheet';
import type { PainInput } from './pain-sheet';
import { PainAfterSend } from './pain-after-send';
import { ResponsiveDialog } from '@/ui/responsive-dialog';

export function PainFlow({ state, onClose }: { state: ReturnType<typeof useFocusSession>; onClose: () => void }) {
  const locale = useLocale();
  const t = useT(messages);
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
  if (!report) return <PainSheet onClose={onClose} onSend={send} exercise={exercise} />;
  const alternative = (current.dropIndex ?? 0) === 0 ? safePainSwap(report.area,
    (current.exercise.alternative_exercises ?? []).filter(row => row.id !== current.exercise.exercise_id), current.exercise.pattern, state.painReports) : undefined;
  return <ResponsiveDialog modal fallbackId="pain-button" aria-label={t('stopped', { exercise })} onDismiss={onClose}
    className="sheet fixed inset-x-0 bottom-0 m-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-card p-card text-ink">
    <PainAfterSend report={report} exercise={exercise} alternative={alternative ? exerciseName(alternative, locale) : undefined}
      onSwap={() => { if (alternative) { state.switchExercise(alternative.id); onClose(); } }}
      onSkip={() => { void state.skipExercise(current.exercise.id); onClose(); }} />
  </ResponsiveDialog>;
}

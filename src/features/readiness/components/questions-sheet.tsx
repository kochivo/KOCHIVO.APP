'use client';

import { useT } from '@/core/i18n/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import type { DailyCheckRow } from '@/core/offline/tables';
import { MorningQuestions } from './morning-questions';
import { messages } from '../messages';

export function QuestionsSheet({ row, onChange, onClose }: {
  row: DailyCheckRow | null;
  onChange: (patch: Partial<Pick<DailyCheckRow, 'sleep_hours' | 'soreness'>>) => void;
  onClose: () => void;
}) {
  const t = useT(messages);
  return <ResponsiveDialog modal fallbackId="readiness-edit" onDismiss={onClose} aria-label={t('questions')}
    className="sheet fixed inset-0 z-50 m-auto w-[calc(100%-2rem)] max-w-lg space-y-4 rounded-card p-5 text-ink">
    <MorningQuestions row={row} onChange={onChange} />
    <button type="button" onClick={onClose} className="min-h-12 w-full rounded-control border border-line px-4">{t('close')}</button>
  </ResponsiveDialog>;
}

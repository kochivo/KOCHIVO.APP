'use client';

import { useT } from '@/core/i18n/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import type { DailyCheckRow } from '@/core/offline/tables';
import { MorningQuestions } from './morning-questions';
import { messages } from '../messages';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { messages as v6Messages } from '../v6-messages';
import { MorningResult } from './morning-result';
import { Button } from '@/ui/button';

export function QuestionsSheet({ row, onChange, onClose, goal }: {
  row: DailyCheckRow | null;
  goal?: number;
  onChange: (patch: Partial<Pick<DailyCheckRow, 'sleep_hours' | 'soreness'>>) => void;
  onClose: () => void;
}) {
  const t = useT(messages);
  const v6t = useT(v6Messages);
  const v6 = captainWorkspaceEnabled();
  return <ResponsiveDialog modal fallbackId="readiness-edit" onDismiss={onClose} aria-label={t('questions')}
    className="sheet fixed inset-0 z-50 m-auto w-[calc(100%-2rem)] max-w-lg space-y-card-gap rounded-card p-card text-ink">
    <MorningQuestions row={row} onChange={onChange} />
    {v6 && <MorningResult row={row} goal={goal} />}
    <Button type="button" onClick={onClose} variant={(v6) ? 'primary' : 'secondary'} block={false} className={v6 ? "min-h-12 w-full px-page-x font-semibold" : "min-h-12 w-full px-page-x"}>{v6 ? v6t('done') : t('close')}</Button>
  </ResponsiveDialog>;
}

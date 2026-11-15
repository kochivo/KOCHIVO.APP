'use client';
import type { DraftExercise, SetTarget } from '@/features/programs';
import { uniformPlan } from '@/lib/set-plan';
import { useT } from '@/core/i18n/client';
import { messages } from '@/lib/training/messages';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { IconButton } from '@/ui/icon-button';
import { Button } from '@/ui/button';
import { X } from 'lucide-react';
import { SetPlanEditor } from './set-plan-editor';

export function SetsSheet({ row, onChange, onClose }: {
  row: DraftExercise; onChange: (plan: SetTarget[] | null) => void; onClose: () => void;
}) {
  const t = useT(messages);
  return <ResponsiveDialog modal openerId={`sets-${row.id}`} fallbackId={`sets-${row.id}`} onDismiss={onClose} aria-label={t('sets')}
    className="sheet fixed inset-0 z-50 m-auto flex max-h-[90dvh] w-[calc(100%-2rem)] max-w-lg flex-col rounded-card text-ink backdrop:bg-bg-deep/80">
    <header className="flex items-center justify-between gap-stack border-b border-line-soft p-card">
      <h2 className="text-title font-semibold">{t('sets')}</h2><IconButton aria-label={t('close')} onClick={onClose}><X aria-hidden /></IconButton>
    </header>
    <div className="min-h-0 overflow-y-auto p-card"><SetPlanEditor plan={row.set_plan ?? uniformPlan(row)} onChange={onChange} /></div>
    <footer className="sticky bottom-0 p-card"><Button type="button" onClick={onClose}>{t('done')}</Button></footer>
  </ResponsiveDialog>;
}

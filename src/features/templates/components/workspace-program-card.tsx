'use client';

import { Pencil } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { starterText } from '@/lib/starter-text';
import { Button } from '@/ui/button';
import { messages } from '../messages';
import type { LibraryTemplate } from '../library-types';

export type WorkspaceProgram = LibraryTemplate & { weekdays?: boolean[]; scheduleError?: string };

export function WorkspaceProgramCard({ template, busy, error, onOpen, onAssign, onRetry }: {
  template: WorkspaceProgram; busy: boolean; error?: string; onOpen: () => void; onAssign: () => void; onRetry: () => void;
}) {
  const t = useT(messages), locale = useLocale();
  const letters = t('programDayLetters').split(' ');
  return <li className="glass min-w-0 rounded-[20px] p-card">
    <div className="mb-stack flex items-center gap-inline">
      <h2 className="min-w-0 break-words text-sm font-bold">{starterText(template.title, locale)}</h2>
      <span className="ms-auto shrink-0 rounded-full bg-ink/5 px-inline py-inline text-micro text-muted">{t('programPlayers', { n: template.uses, count: formatNumber(template.uses, locale) })}</span>
    </div>
    <p className="text-xs text-muted">{t('programDays', { n: template.count, count: formatNumber(template.count, locale) })}</p>
    {template.weekdays && <div className="my-stack flex" aria-label={t('programTrainingDays')}>
      {letters.map((letter, index) => <span key={index} aria-label={t(template.weekdays?.[index] ? 'programTrainingDay' : 'programRestDay', { day: letter })}
        className={`flex h-[26px] flex-1 items-center justify-center whitespace-nowrap rounded-control text-micro ${template.weekdays?.[index] ? 'bg-lime-soft text-lime' : 'bg-ink/5 text-muted'}`}>{letter}</span>)}
    </div>}
    {template.scheduleError && <div role="alert" className="my-stack text-xs text-danger">{template.scheduleError}
      <Button variant="secondary" className="min-h-12" onClick={onRetry}>{t('tryAgain')}</Button></div>}
    <div className="mt-stack flex gap-inline">
      <Button variant="secondary" className="min-h-12 flex-1 rounded-full px-stack text-xs" disabled={busy} onClick={onOpen}><Pencil aria-hidden className="size-3.5" />{t('programEdit')}</Button>
      <Button variant="secondary" className="min-h-12 flex-1 rounded-full px-stack text-xs" disabled={busy} onClick={onAssign}>{t('assignToPlayer')}</Button>
    </div>
    {error && <p role="alert" className="mt-inline text-sm text-danger">{error}</p>}
  </li>;
}

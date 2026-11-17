'use client';

import { Ellipsis } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { starterText } from '@/lib/starter-text';
import { Button, clickableClass } from '@/ui/button';
import { messages } from '../messages';
import { messages as libraryMessages } from '../library-messages';
import type { LibraryTemplate } from '../library-types';

export type WorkspaceProgram = LibraryTemplate & { weekdays?: boolean[]; scheduleError?: string };

export function WorkspaceProgramCard({ template, busy, error, onOpen, onAssign, onRetry }: {
  template: WorkspaceProgram; busy: boolean; error?: string; onOpen: () => void; onAssign: () => void; onRetry: () => void;
}) {
  const t = useT(messages), lt = useT(libraryMessages), locale = useLocale();
  const letters = t('programDayLetters').split(' ');
  return <li className="glass relative flex min-w-0 flex-col rounded-card p-card has-[details[open]]:z-20">
    <div className="flex items-center justify-between gap-inline">
      {template.level && <span className="tone-info rounded-md px-inline text-micro font-semibold">{lt(template.level)}</span>}
      <details className="relative ms-auto">
        <summary aria-label={lt('more')} className={`${clickableClass} grid min-h-12 min-w-12 list-none place-items-center rounded-control text-muted`}><Ellipsis aria-hidden className="size-4" /></summary>
        <div className="absolute end-0 z-20 grid min-w-40 rounded-control border border-line bg-surface-raised p-inline">
          <Button variant="ghost" disabled={busy} onClick={onOpen}>{t('programEdit')}</Button>
          <Button variant="ghost" disabled={busy} onClick={onAssign}>{t('assignToPlayer')}</Button>
        </div>
      </details>
    </div>
    <h2><button type="button" disabled={busy} onClick={onOpen} className={`${clickableClass} min-h-12 w-full break-words text-start text-title font-bold`}>{starterText(template.title, locale)}</button></h2>
    <p className="mb-stack text-xs text-muted">{t('programDays', { n: template.count, count: formatNumber(template.count, locale) })}</p>
    {template.weekdays && <div className="mb-stack grid grid-cols-7 gap-inline" aria-label={t('programTrainingDays')}>
      {letters.map((letter, index) => <span key={index} aria-label={t(template.weekdays?.[index] ? 'programTrainingDay' : 'programRestDay', { day: letter })}
        className={`grid min-h-6 place-items-center rounded-md text-micro ${template.weekdays?.[index] ? 'bg-lime-soft text-lime' : 'tone-neutral'}`}>{letter}</span>)}
    </div>}
    {template.scheduleError && <div role="alert" className="my-stack text-xs text-danger">{template.scheduleError}
      <Button variant="secondary" className="min-h-12" onClick={onRetry}>{t('tryAgain')}</Button></div>}
    <p className="mt-auto border-t border-line-soft pt-stack text-xs text-muted">{t('programPlayers', { n: template.uses, count: formatNumber(template.uses, locale) })}</p>
    {error && <p role="alert" className="mt-inline text-sm text-danger">{error}</p>}
  </li>;
}

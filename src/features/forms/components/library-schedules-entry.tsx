'use client';
import { useState } from 'react';
import type { Locale } from '@/core/i18n/locale';
import { useT } from '@/core/i18n/client';
import { messages } from '../redesign/messages';
import { AssessmentScheduleEntry } from './assessment-schedule-entry';

export function LibrarySchedulesEntry({ formId, locale, ready = true }: { formId: string; locale: Locale; ready?: boolean }) {
  const [open, setOpen] = useState(false), t = useT(messages);
  return <details className="glass rounded-card border border-line-soft p-5" id="schedules" onToggle={e => setOpen(e.currentTarget.open)}>
    <summary aria-disabled={!ready || undefined} onClick={e => { if (!ready) e.preventDefault(); }}
      className="min-h-12 cursor-pointer py-3 text-muted aria-disabled:cursor-default aria-disabled:opacity-50">{t('schedule')}</summary>
    {open && <AssessmentScheduleEntry formId={formId} locale={locale} />}
  </details>;
}

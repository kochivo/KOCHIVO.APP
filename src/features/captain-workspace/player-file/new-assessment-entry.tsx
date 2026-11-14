'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { KoPlus } from '@/ui/icons/ko-plus';
import { v11Messages } from './v11-messages';
import { FileState } from './file-state';
import { useLocale } from '@/core/i18n/client';

function Loading() { return <FileState locale={useLocale()} />; }
const Schedule = dynamic(() => import('@/features/forms').then(module => module.AssessmentScheduleEntry), { loading: Loading });
export function NewAssessmentEntry({ playerId, locale }: { playerId: string; locale: Locale }) {
  const [open, setOpen] = useState(false), t = createT(v11Messages, locale);
  return <div className={open ? 'col-span-full' : ''}>
    <button className="glass flex min-h-[90px] w-full items-center justify-center gap-2 rounded-card border border-line-soft p-5 text-lime" onClick={() => setOpen(!open)}>
      <KoPlus className="size-5" />{t(open ? 'close' : 'newAssessment')}
    </button>
    {open && <Schedule playerId={playerId} locale={locale} />}
  </div>;
}

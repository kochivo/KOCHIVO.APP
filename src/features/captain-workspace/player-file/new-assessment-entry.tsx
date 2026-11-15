'use client';
import { useState } from 'react';
import dynamic from 'next/dynamic';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { KoPlus } from '@/ui/icons/ko-plus';
import { v11Messages } from './v11-messages';
import { FileState } from './file-state';
import { useLocale } from '@/core/i18n/client';
import { ChevronDown } from 'lucide-react';

function Loading() { return <FileState locale={useLocale()} />; }
const Schedule = dynamic(() => import('@/features/forms').then(module => module.AssessmentScheduleEntry), { loading: Loading });
export function NewAssessmentEntry({ playerId, locale }: { playerId: string; locale: Locale }) {
  const [open, setOpen] = useState(false), t = createT(v11Messages, locale);
  return <div className={open ? 'col-span-full' : ''}>
    <button aria-expanded={open} className="glass press flex min-h-[90px] w-full cursor-pointer items-center justify-center gap-2 rounded-card border border-line-soft p-5 text-ink focus-visible:ring-2 focus-visible:ring-lime" onClick={() => setOpen(!open)}>
      <KoPlus aria-hidden className="size-5 text-lime" />{t(open ? 'close' : 'newAssessment')}<ChevronDown aria-hidden className={`size-5 ${open ? 'rotate-180' : ''}`} />
    </button>
    {open && <Schedule playerId={playerId} locale={locale} />}
  </div>;
}

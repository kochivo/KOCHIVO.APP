'use client';
import { useState } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { Copy } from 'lucide-react';
import { KoTraining } from '@/ui/icons/ko-training';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import type { ProgramSummary } from './player-program-model';
import { ProgramWeekPill } from './program-week-pill';
import { ProgramPrescriptionRow } from './program-prescription-row';
import { ProgramCardioPrescription } from './program-cardio-prescription';
import { messages } from './player-program-messages';
import { Button, buttonClass } from '@/ui/button';

function Loading() { return <p role="status" className="glass rounded-card p-4">{useT(messages)('loading')}</p>; }
const Start = dynamic(() => import('./player-program-start-entry').then(module => module.PlayerProgramStartEntry), { loading: Loading });

export function PlayerProgramSummary({ playerId, program, draftId, today, locale }: {
  playerId: string; program: ProgramSummary | null; draftId?: string; today: string; locale: Locale;
}) {
  const t = createT(messages, locale);
  const [selected, setSelected] = useState(''), [starting, setStarting] = useState(false);
  const day = program?.days.find(day => day.id === selected) ?? program?.days.find(day => !day.rest) ?? program?.days[0];
  return <section className="glass min-w-0 space-y-3 rounded-card border border-line-soft p-3.5">
    {program ? <>
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-sm font-semibold">{program.title}</h2>
        <ProgramWeekPill startedOn={program.startedOn} totalWeeks={program.totalWeeks} today={today} locale={locale} />
        <Button id="player-program-change" onClick={() => setStarting(true)} variant="secondary" block={false} className="ms-auto px-3"><Copy aria-hidden className="size-4" />{t('change')}</Button>
        <Link href={`/captain/programs/${program.id}`} prefetch={false} className={buttonClass({ block: false })}><KoTraining aria-hidden className="size-4" />{t('edit')}</Link>
      </div>
      {program.days.length ? <>
        <div role="tablist" aria-label={t('days')} className="flex w-fit max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-bg/25 p-1">
          {program.days.map(item => <button key={item.id} role="tab" aria-selected={day?.id === item.id} aria-controls={`program-day-${item.id}`} id={`program-tab-${item.id}`} onClick={() => setSelected(item.id)}
            className={`press min-h-12 shrink-0 cursor-pointer whitespace-nowrap rounded-full px-3 text-xs focus-visible:ring-2 focus-visible:ring-lime ${day?.id === item.id ? 'glass-strong text-ink' : 'text-muted hover:bg-surface-raised'}`}>{item.title || item.rest ? t('day', { number: formatNumber(item.position, locale), title: item.title || t('restDay') }) : t('dayNumber', { number: formatNumber(item.position, locale) })}</button>)}
        </div>
        {day && <div role="tabpanel" id={`program-day-${day.id}`} aria-labelledby={`program-tab-${day.id}`}>
          {day.exercises.length || day.cardio?.length ? <ul>
            {day.exercises.map(row => <ProgramPrescriptionRow key={row.id} row={row} locale={locale} />)}
            {day.cardio?.map(row => <ProgramCardioPrescription key={row.id} row={row} locale={locale} />)}
          </ul> : <p className="py-4 text-sm text-muted">{t(day.rest ? 'restDay' : 'noExercises')}</p>}
        </div>}
      </> : <p className="py-4 text-sm text-muted">{t('noDays')}</p>}
    </> : <div className="space-y-3 py-6 text-center">
      <h2 className="font-semibold">{t('empty')}</h2><p className="text-sm text-muted">{t('emptyBody')}</p>
      {draftId ? <Link href={`/captain/programs/${draftId}`} prefetch={false} className={buttonClass({ block: false })}><KoTraining aria-hidden className="size-5" />{t('assign')}</Link> :
        <Button id="player-program-change" onClick={() => setStarting(true)} block={false}><KoTraining aria-hidden className="size-5" />{t('assign')}</Button>}
    </div>}
    {starting && <Start playerId={playerId} templatesInitially={Boolean(program)} onClose={() => setStarting(false)} />}
  </section>;
}

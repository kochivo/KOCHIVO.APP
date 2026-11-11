'use client';

import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import type { ProgramDraft } from '@/features/programs';
import { starterText } from '@/lib/starter-text';
import { messages } from '../messages';
import { weekCells } from '../week-cells';
import { useSelectedDay } from '../hooks/use-selected-day';
import { ExerciseRow } from './exercise-row';
import { FitScoreSlot } from './fit-score-slot';
import { WeekStrip } from './week-strip';

export function WorkspacePlan({ program, locale }: { program: ProgramDraft; locale: Locale }) {
  const t = createT(messages, locale);
  const cells = weekCells(program);
  const { selected, select } = useSelectedDay(cells);
  const day = selected?.day;
  return <section className="min-w-0 space-y-5">
    <header className="flex items-end gap-4">
      <div className="min-w-0 space-y-2">
        <p className="text-sm text-muted">{t(cells.some(cell => cell.weekday) ? 'weekly' : 'rotation')}</p>
        <h2 className="break-words font-display text-3xl font-bold lg:text-4xl">{starterText(program.title, locale)}</h2>
      </div>
      <FitScoreSlot />
    </header>
    {cells.length > 0 ? <WeekStrip cells={cells} selectedId={selected?.id} onSelect={select} locale={locale} /> :
      <p className="glass rounded-card p-6 text-muted">{t('noDays')}</p>}
    {selected && <section className="space-y-3" aria-live="polite">
      <h3 className="text-xl font-bold">{selected.rest ? t('rest') : day?.title ? starterText(day.title, locale) : t('training')}</h3>
      {selected.rest ? <p className="glass rounded-card p-6 text-muted">{t('restBody')}</p> :
        day?.exercises.length ? <ul className="space-y-3">{day.exercises.map(row => <ExerciseRow key={row.id} row={row} locale={locale} />)}</ul> :
          <p className="glass rounded-card p-6 text-muted">{t('noExercises')}</p>}
    </section>}
    <div data-workspace-slot="editing" />
  </section>;
}

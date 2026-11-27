'use client';

import { Check, Pencil } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { cn } from '@/lib/cn';
import type { useFocusSession } from '../hooks/use-focus-session';
import { messages } from '../messages';
import { messages as tableMessages } from '../v6-messages';
import { SetDots } from './set-dots';

type TableState = Pick<ReturnType<typeof useFocusSession>, 'current' | 'lastSession' | 'doneSets' | 'weight' | 'reps' | 'disabled' | 'edit'>;

export function FocusSetTable({ state }: { state: TableState }) {
  const t = useT(messages);
  const tt = useT(tableMessages);
  const locale = useLocale();
  const { current } = state;
  if (!current) return null;
  if (!current.exercise.sets) return <SetDots exercise={current.exercise} currentIndex={current.setIndex}
    doneSets={state.doneSets} onEdit={state.edit} disabled={state.disabled} />;
  const number = (value?: number | null) => value == null ? '—' : formatNumber(value, locale);
  const cell = 'glass-strong min-h-12 content-center rounded-control font-display text-title font-extrabold tabular-nums';
  return <table aria-label={t('exerciseSets')} className="w-full table-fixed border-separate border-spacing-y-inline text-center">
    <thead className="text-micro text-muted">
      <tr><th scope="col" className="w-8">{tt('number')}</th>
        <th scope="col" className="w-1/5">{tt('previous')}</th>
        <th scope="col">{tt('kg')}</th><th scope="col">{tt('reps')}</th>
        <th scope="col" className="w-14"><span /></th></tr>
    </thead>
    <tbody>{Array.from({ length: current.exercise.sets }, (_, index) => {
      const set = index + 1;
      const active = set === current.setIndex;
      const previous = state.lastSession?.sets.find(row => row.set_index === set);
      const done = state.doneSets.find(row => row.program_exercise_id === current.exercise.id && row.set_index === set && (row.drop_index ?? 0) === 0);
      return <tr key={set} aria-current={active ? 'step' : undefined} className={active ? 'bg-lime-soft' : undefined}>
        <th scope="row" className={cn('relative rounded-s-control text-xs', done ? 'text-lime' : 'text-muted')}>{number(set)}
          {done && <><Check aria-hidden className="absolute start-1/2 top-[calc(50%+0.5rem)] size-3 -translate-x-1/2 rtl:translate-x-1/2" />
            <span className="sr-only">{t('setCompleted')}</span></>}
        </th>
        <td className="text-micro text-muted"><bdi>{previous ? `${number(previous.weight_kg)} × ${number(previous.reps)}` : '—'}</bdi></td>
        <td className="px-inline"><div className={cell}><bdi>{number(active ? state.weight : done?.weight_kg)}</bdi></div></td>
        <td><div className={cell}><bdi>{number(active ? state.reps : done?.reps)}</bdi></div></td>
        <td className="rounded-e-control">{done ? <button type="button" disabled={state.disabled}
          aria-label={t('editSet', { value0: number(set) })} onClick={() => state.edit(done)}
          className="press tone-lime mx-auto grid size-12 place-items-center rounded-control disabled:opacity-50">
          <Pencil aria-hidden className="size-5" /></button> : null}</td>
      </tr>;
    })}</tbody>
  </table>;
}

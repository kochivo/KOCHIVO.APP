import { useT } from '@/core/i18n/client';
import { messages } from './messages';
import type { TrainingSheet } from './training-sheet';

export function TrainingPreview({ plan }: { plan: TrainingSheet }) {
  const t = useT(messages);
  return <div className="space-y-card-gap">
    <p className="font-semibold">{t('weekCount', { n: plan.weeks })}</p>
    <p className="text-sm text-muted">{t('trainingScope')}</p>
    {plan.days.some(day => day.exercises.some(row => row.rest === null)) && <label className="grid gap-inline">
      {t('missingRest')}
      <input name="defaultRest" required type="number" min={0} max={900} step={15}
        className="min-h-12 rounded-control border border-line bg-surface px-stack" />
    </label>}
    {plan.days.map((day, dayIndex) => <section key={dayIndex} className="recessed space-y-stack rounded-card p-card">
      <h2 className="text-title font-semibold">{day.name}</h2>
      {day.warmup.length > 0 && <div className="space-y-inline text-sm text-muted">
        <p className="font-semibold">{t('generalWarmup')}</p>
        <ul className="space-y-inline">
          {day.warmup.map((item, index) => <li key={index}><bdi>{item.name}</bdi>{' · '}{item.note}</li>)}
        </ul>
      </div>}
      <ul className="divide-y divide-line">
        {day.exercises.map((row, rowIndex) => <li key={rowIndex} className="space-y-inline py-stack">
          <p className="font-semibold"><bdi>{row.name}</bdi></p>
          <p className="text-sm text-muted">{t('setTarget', {
            sets: row.sets, reps: row.repsMax === null ? t('failure') : row.repsMin === row.repsMax
              ? row.repsMin : `${row.repsMin}–${row.repsMax}`,
          })}{row.rest === null ? '' : ` · ${t('parsedRest', { n: row.rest })}`}
          {row.warmup && ` · ${t('warmup', { value: row.warmup })}`}</p>
          {!row.rirText && row.rirs.some(value => value !== null) &&
            <p className="text-sm text-muted">{t('rir')} <bdi>{row.rirs.join(' / ')}</bdi></p>}
          {row.note && <p className="text-sm">{row.note}</p>}
          {row.rirText && <fieldset className="space-y-inline">
            <legend className="text-sm text-warn">{t('rirSource', { value: row.rirText })}</legend>
            {row.rirs.map((value, set) => <label key={set} className="flex flex-wrap items-center gap-inline text-sm">
              {t('rirSelect', { n: set + 1 })}
              <input className="min-h-12 rounded-control border border-line bg-surface px-stack" name={`rir:${dayIndex}:${rowIndex}:${set}`}
                required type="number" min={0} max={5} step={1} defaultValue={value ?? ''} />
            </label>)}
          </fieldset>}
        </li>)}
      </ul>
    </section>)}
  </div>;
}

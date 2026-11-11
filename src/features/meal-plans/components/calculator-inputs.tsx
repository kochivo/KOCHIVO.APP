'use client';

import { useT } from '@/core/i18n/client';
import type { PlayerFacts } from '@/features/player-file';
import type { BodyInputs } from '../energy';
import { CalculatorField } from './calculator-field';
import { CalculatorSource } from './calculator-source';
import { messages } from './calculator/messages';

export type CalculatorValues = Partial<BodyInputs> & { trainingDays?: number; sessionMinutes?: number };
export function CalculatorInputs({ facts, values, onChange }: {
  facts: PlayerFacts; values: CalculatorValues; onChange: (values: CalculatorValues) => void;
}) {
  const t = useT(messages);
  const fields = [
    ['weightKg', 'weight', 1, 500, .1], ['heightCm', 'height', 50, 250, 1], ['age', 'age', 10, 120, 1],
    ['trainingDays', 'trainingDays', 0, 7, 1], ['sessionMinutes', 'sessionMinutes', 0, 600, 1],
    ['bodyFatPct', undefined, 0, 99, .1],
  ] as const;
  const sexSource = facts.sex?.source;
  return <section className="grid content-start gap-4" aria-label={t('inputs')}>
    <header><h2 className="text-xl font-bold">{t('inputs')}</h2><p className="text-sm text-muted">{t('fromFile')}</p></header>
    <div className="grid gap-3 sm:grid-cols-2">{fields.map(([key, factKey, min, max, step]) =>
      <CalculatorField key={key} label={t(key)} value={values[key]} source={factKey ? facts[factKey]?.source : undefined}
        min={min} max={max} step={step} onChange={value => onChange({ ...values, [key]: value })} />)}
      <div className="glass grid gap-2 rounded-control p-4">
        <label className="grid gap-2 font-semibold">{t('sex')}
          <select value={values.sex ?? ''} disabled={!!sexSource && !!values.sex}
            onChange={event => onChange({ ...values, sex: event.target.value === 'male' ? 'male' : event.target.value === 'female' ? 'female' : undefined })}
            className="min-h-12 rounded-control bg-surface px-3">
            <option value="">{t('add')}</option><option value="male">{t('male')}</option><option value="female">{t('female')}</option>
          </select>
        </label>
        <CalculatorSource source={sexSource} local={!!values.sex} />
      </div>
    </div>
    <p className="text-sm text-muted">{t('formula')}</p>
  </section>;
}

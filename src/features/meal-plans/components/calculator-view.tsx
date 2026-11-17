'use client';
import { NumberInput } from '@/ui/number-input';

import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import type { PlayerFile } from '@/features/player-file';
import { calculateEnergy, macros } from '../energy';
import type { Goal } from '../energy';
import type { PlanSummary } from '../types';
import { CalculatorInputs } from './calculator-inputs';
import type { CalculatorValues } from './calculator-inputs';
import { CalculatorResults } from './calculator-results';
import { CalculatorApply } from './calculator-apply';
import { CalculatorSource } from './calculator-source';
import { messages } from './calculator/messages';

export function initialCalculatorValues({ facts }: PlayerFile): CalculatorValues {
  const sex = facts.sex?.value;
  return { weightKg: facts.weight?.value, heightCm: facts.height?.value, age: facts.age?.value,
    sex: sex === 'male' || sex === 'female' ? sex : undefined,
    trainingDays: facts.trainingDays?.value.length, sessionMinutes: facts.sessionMinutes?.value };
}

export function calculatorResult(values: CalculatorValues, goal: Goal, rate: number) {
  const { weightKg, heightCm, age, sex, trainingDays, sessionMinutes, bodyFatPct } = values;
  if (weightKg === undefined || heightCm === undefined || age === undefined || !sex || trainingDays === undefined || sessionMinutes === undefined) return null;
  if (weightKg < 1 || weightKg > 500 || heightCm < 50 || heightCm > 250 || age < 10 || age > 120 || sessionMinutes > 600 || rate > 2) return null;
  try {
    const energy = calculateEnergy({ weightKg, heightCm, age, sex, bodyFatPct }, trainingDays, sessionMinutes, goal, rate);
    const allocation = macros(energy.target, weightKg);
    return { energy, targets: { kcal: energy.target, ...allocation.grams } };
  } catch { return null; }
}

export function initialCalculatorGoal({ facts }: PlayerFile): Goal {
  const weight = facts.weight?.value;
  const target = facts.targetWeight?.value;
  if (weight === undefined || target == null) return 'maintain';
  return target < weight ? 'cut' : target > weight ? 'bulk' : 'maintain';
}

export function CalculatorView({ playerId, file, plans }: { playerId: string; file: PlayerFile; plans: PlanSummary[] }) {
  const t = useT(messages);
  const [values, setValues] = useState(() => initialCalculatorValues(file));
  const [goal, setGoal] = useState<Goal>(() => initialCalculatorGoal(file));
  const [goalFromFile, setGoalFromFile] = useState(file.facts.targetWeight?.value != null && file.facts.weight?.value !== undefined);
  const [rate, setRate] = useState(goal === 'bulk' ? .25 : .5);
  const [split, setSplit] = useState(true);
  const result = calculatorResult(values, goal, rate);
  if (!file.history.some(entry => entry.source.kind === 'intake')) return <section className="glass rounded-card p-section">
    <h1 className="text-2xl font-bold">{t('noIntake')}</h1><p className="mt-stack text-muted">{t('requestUpdate')}</p>
  </section>;
  return <div className="grid gap-card-gap lg:grid-cols-2">
    <div className="glass grid content-start gap-card-gap rounded-card p-card">
      <CalculatorInputs facts={file.facts} values={values} onChange={setValues} />
      <fieldset className="grid gap-stack"><legend className="mb-stack font-semibold">{t('goal')}</legend>
        <CalculatorSource source={goalFromFile ? file.facts.targetWeight?.source : undefined} local />
        <div className="grid grid-cols-3 gap-inline">{(['cut', 'maintain', 'bulk'] as const).map(value => <button key={value}
          type="button" aria-pressed={goal === value} onClick={() => { setGoal(value); setGoalFromFile(false); setRate(value === 'bulk' ? .25 : .5); }}
          className={`min-h-12 rounded-control border px-stack ${goal === value ? 'border-lime text-lime' : 'border-line'}`}>{t(value)}</button>)}</div>
        {goal !== 'maintain' && <label className="grid gap-inline">{t('rate')}<NumberInput allowEmpty min={0} max={2} step={.05}
          value={Number.isNaN(rate) ? '' : rate} onCommit={value => setRate(value === null ? NaN : value)}
          className="min-h-12 rounded-control bg-surface px-stack" /><CalculatorSource local /></label>}
      </fieldset>
    </div>
    <div className="grid content-start gap-card-gap">
      {result && values.weightKg !== undefined && values.trainingDays !== undefined
        ? <CalculatorResults result={result.energy} weightKg={values.weightKg} trainingDays={values.trainingDays} split={split} onSplit={setSplit} />
        : <p role="status" className="glass rounded-card p-card">{t('invalid')}</p>}
      <CalculatorApply playerId={playerId} plans={plans} targets={result?.targets ?? null} />
    </div>
  </div>;
}

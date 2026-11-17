'use client';
import { NumberInput } from '@/ui/number-input';

import { editableFieldClass } from '@/ui/edit-in-place';
import { clickableClass, Button } from '@/ui/button';
import { Trash2 } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { uuidv7 } from '@/core/offline/ids';
import { KoPlus } from '@/ui/icons/ko-plus';

import { foodFormMessages } from '../messages';
import { unitKcal } from '../macro-check';
import type { FoodUnit } from '../types';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export function FoodUnitsEditor({ units, kcal, onChange }: {
  units: FoodUnit[]; kcal: number; onChange: (units: FoodUnit[]) => void;
}) {
  const t = useT(foodFormMessages);
  function update(key: string, value: Partial<FoodUnit>) {
    onChange(units.map(unit => unit.key === key ? { ...unit, ...value } : unit));
  }
  const input = 'min-h-12 min-w-0 w-full rounded-control border border-line bg-surface px-stack';
  return <section className={captainWorkspaceEnabled() ? 'glass grid gap-stack rounded-card p-card' : 'glass grid gap-stack rounded-card p-card'}>
    <div><h2 className="font-bold">{t('units')}</h2><p className="text-sm text-muted">{t('unitsHint')}</p></div>
    {!units.length && <p className="text-sm text-muted">{t('emptyUnits')}</p>}
    {units.map(unit => <div key={unit.key} className="grid grid-cols-[1fr_1fr_auto] items-end gap-inline">
      <label className="grid gap-inline text-sm">{t('unitName')}<input className={captainWorkspaceEnabled() ? `${editableFieldClass} ${input}` : input} required maxLength={60} value={unit.name_ar}
        onChange={event => update(unit.key, { name_ar: event.target.value,
          name_en: unit.name_en === unit.name_ar ? event.target.value : unit.name_en })} /></label>
      <label className="grid gap-inline text-sm">{t('unitGrams')}<NumberInput className={captainWorkspaceEnabled() ? `${editableFieldClass} ${input}` : input} required min={Number.MIN_VALUE} max={10000} step="any" value={unit.grams || ''}
        onCommit={value => update(unit.key, { grams: value })} /></label>
      <button className={captainWorkspaceEnabled() ? `${clickableClass} ${captainWorkspaceEnabled() ? 'press flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-control border border-line bg-surface text-muted focus-visible:ring-2 focus-visible:ring-lime' : 'flex min-h-12 min-w-12 items-center justify-center text-muted'}` : captainWorkspaceEnabled() ? 'press flex min-h-12 min-w-12 cursor-pointer items-center justify-center rounded-control border border-line bg-surface text-muted focus-visible:ring-2 focus-visible:ring-lime' : 'flex min-h-12 min-w-12 items-center justify-center text-muted'} type="button" aria-label={t('removeUnit')}
        onClick={() => onChange(units.filter(row => row.key !== unit.key))}><Trash2 aria-hidden className="size-4" /></button>
      <output className="col-span-3 text-sm tabular-nums text-muted">{t('kcal', { value: Math.round(unitKcal(kcal, unit.grams)) })}</output>
    </div>)}
    <Button variant="secondary" type="button" disabled={units.length >= 20}
      onClick={() => onChange([...units, { key: uuidv7(), name_ar: '', name_en: '', grams: 100 }])}>
      <KoPlus aria-hidden className="size-4" />{t('addUnit')}
    </Button>
  </section>;
}

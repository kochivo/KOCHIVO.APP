'use client';

import { editableFieldClass } from '@/ui/edit-in-place';
import { Button } from '@/ui/button';
import { IconButton } from '@/ui/icon-button';
import { KoPlus } from '@/ui/icons/ko-plus';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { Plus, Trash2 } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { uuidv7 } from '@/core/offline/ids';
import type { FoodUnit } from '../../types';
import { messages } from './messages';

export function FoodUnits({ units, onChange, disabled }: { units: FoodUnit[]; onChange: (units: FoodUnit[]) => void; disabled: boolean }) {
  const PlusIcon = captainWorkspaceEnabled() ? KoPlus : Plus;
  const t = useT(messages);
  function update(index: number, patch: Partial<FoodUnit>) {
    onChange(units.map((unit, i) => i === index ? { ...unit, ...patch } : unit));
  }
  const input = 'min-h-12 w-full min-w-0 rounded-control border border-line bg-surface px-3';
  return <fieldset disabled={disabled} className="grid gap-3">
    <legend>{t('units')}</legend>
    {!units.length && <p className="text-sm text-muted">{t('noUnits')}</p>}
    {units.map((unit, index) => <div key={unit.key} className="grid grid-cols-2 gap-2 rounded-control border border-line p-2">
      <label>{t('unitAr')}<input className={captainWorkspaceEnabled() ? `${editableFieldClass} ${input}` : input} required maxLength={60} value={unit.name_ar} onChange={e => update(index, { name_ar: e.target.value })} /></label>
      <label>{t('unitEn')}<input className={captainWorkspaceEnabled() ? `${editableFieldClass} ${input}` : input} required maxLength={60} value={unit.name_en} onChange={e => update(index, { name_en: e.target.value })} /></label>
      <label>{t('grams')}<input className={captainWorkspaceEnabled() ? `${editableFieldClass} ${input}` : input} required type="number" min={0.1} max={10000} step="0.1" value={unit.grams} onChange={e => update(index, { grams: Number(e.target.value) })} /></label>
      {!disabled && <IconButton type="button" className="border border-danger/40 text-danger! min-h-12 justify-self-end px-3" aria-label={t('removeUnit')}
        onClick={() => onChange(units.filter((_, i) => i !== index))}><Trash2 aria-hidden className="size-5" /></IconButton>}
    </div>)}
    {!disabled && <Button variant="secondary" type="button" disabled={units.length >= 20} className="flex min-h-12 items-center gap-2 text-ink"
      onClick={() => onChange([...units, { key: uuidv7(), name_ar: '', name_en: '', grams: 100 }])}><PlusIcon aria-hidden className="size-4" />{t('addUnit')}</Button>}
  </fieldset>;
}

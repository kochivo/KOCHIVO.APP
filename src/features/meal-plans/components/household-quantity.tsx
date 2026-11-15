'use client';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { editableFieldClass } from '@/ui/edit-in-place';
import { useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { Stepper } from '@/ui';
import { formatNumber } from '@/lib/format';
import type { MealItem } from '../types';
import { unitGrams, unitQuantity } from '../editor-rules';
import { messages } from './editor/messages';
import { messages as planMessages } from '../messages';
import { messages as workspaceMessages } from './editor/workspace/messages';

export function HouseholdQuantity({ item, onChange }: { item: MealItem; onChange: (grams: number) => void }) {
  const t = useT(messages);
  const planT = useT(planMessages);
  const workspaceT = useT(workspaceMessages);
  const locale = useLocale();
  const [key, setKey] = useState(item.food.units?.[0]?.key ?? '');
  const unit = item.food.units?.find(unit => unit.key === key);
  const name = unit ? locale === 'ar' ? unit.name_ar : unit.name_en : planT('grams');
  return <div className="grid gap-inline">
    {!!item.food.units?.length && <label>{t('unit')}<select aria-label={t('unit')} value={key} onChange={event => setKey(event.target.value)} className={captainWorkspaceEnabled() ? `${editableFieldClass} ms-inline min-h-12 rounded-control bg-surface px-stack` : "ms-inline min-h-12 rounded-control bg-surface px-stack"}>
      <option value="">{planT('grams')}</option>
      {item.food.units.map(unit => <option key={unit.key} value={unit.key}>{locale === 'ar' ? unit.name_ar : unit.name_en}</option>)}
    </select></label>}
    <span className="whitespace-normal break-words text-sm text-muted">{unit ? workspaceT('unitLabel', { name, grams: formatNumber(unit.grams, locale) }) : name}</span>
    <Stepper size="compact" label={t('quantity', { name: item.food.name })} value={unitQuantity(item.grams, unit)}
      step={unit ? 1 : 5} min={5 / (unit?.grams ?? 1)} max={2000 / (unit?.grams ?? 1)}
      onChange={value => onChange(Math.min(2000, Math.max(5, unitGrams(value, unit))))}
      format={value => formatNumber(Math.round(value * 100) / 100, locale)} />
  </div>;
}

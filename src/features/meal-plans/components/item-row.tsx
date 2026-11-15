'use client';

import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { IconButton } from '@/ui/icon-button';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from '../messages';
import { useState } from 'react';
import { ArrowDown, ArrowUp, Trash2, Utensils } from 'lucide-react';
import { Button } from '@/ui/button';
import { EmptyState, Stepper } from '@/ui';
import { uuidv7 } from '@/core/offline/ids';
import { macrosFor } from '@/lib/macros';
import { foodPhotoUrl } from '@/core/storage/media-url';
import { addAlternative, moveItem, removeAlternative, removeItem, setGrams } from '../draft';
import { FoodPicker } from './food-picker';
import type { MealItem, PlanDraft } from '../types';
import type { PlayerFacts } from '@/features/player-file';
import { flagFood } from '../food-flags';
import { HouseholdQuantity } from './household-quantity';
import { messages as editorMessages } from './editor/messages';
import { flagLabels } from './editor/flag-labels';
import { missingNutrition } from './editor/nutrition-values';
import { messages as workspaceMessages } from './editor/workspace/messages';
import { useToast } from '@/ui/toast';
import { messages as successMessages } from '../success/messages';

export function ItemRow({ item, first, last, update, enhanced = false, facts = {} }: { item: MealItem; first: boolean; last: boolean; update: (change: (draft: PlanDraft) => PlanDraft) => void; enhanced?: boolean; facts?: PlayerFacts }) {
  const t = useT(messages);
  const editorT = useT(editorMessages);
  const workspaceT = useT(workspaceMessages);
  const locale = useLocale();
  const success = useT(successMessages), toast = useToast();
  const [expanded, setExpanded] = useState(false);
  const [picking, setPicking] = useState(false);
  const macros = macrosFor(item.food, item.grams);
  const flags = enhanced ? flagFood(item.food, facts) : [];
  return <li className={`glass-strong grid gap-3 rounded-card p-4${flags.length ? ' border border-danger text-danger' : ''}`}>
    <div className="flex flex-wrap items-center justify-between gap-2">
      {/* Public storage hosts vary by deployment and are not in the optimizer allowlist. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {item.food.photo && <img src={foodPhotoUrl(item.food.photo)} alt="" width={48} height={48} loading="lazy" decoding="async" className="size-12 rounded-control object-cover" />}
      <h3 className="font-bold">{item.food.name}</h3>
      <div className="flex gap-1">
        {captainWorkspaceEnabled() ? <IconButton disabled={first} aria-label={t('moveFoodUp')} onClick={() => update(d => moveItem(d, item.id, -1))}><ArrowUp aria-hidden className="dir-icon" /></IconButton> : <Button variant="ghost" disabled={first} aria-label={t('moveFoodUp')} onClick={() => update(d => moveItem(d, item.id, -1))}><ArrowUp aria-hidden className="dir-icon" /></Button>}
        {captainWorkspaceEnabled() ? <IconButton disabled={last} aria-label={t('moveFoodDown')} onClick={() => update(d => moveItem(d, item.id, 1))}><ArrowDown aria-hidden className="dir-icon" /></IconButton> : <Button variant="ghost" disabled={last} aria-label={t('moveFoodDown')} onClick={() => update(d => moveItem(d, item.id, 1))}><ArrowDown aria-hidden className="dir-icon" /></Button>}
        {captainWorkspaceEnabled() ? <IconButton className="border border-danger/40 text-danger!" aria-label={t('deleteFood')} onClick={() => update(d => removeItem(d, item.id))}><Trash2 aria-hidden /></IconButton> : <Button variant="ghost" aria-label={t('deleteFood')} onClick={() => update(d => removeItem(d, item.id))}><Trash2 aria-hidden /></Button>}
      </div>
    </div>
    {enhanced ? <HouseholdQuantity item={item} onChange={grams => update(d => setGrams(d, item.id, grams, t))} />
      : <Stepper label={t('gramsOf', { v0: item.food.name })} min={5} step={5} value={item.grams}
        onChange={grams => update(d => setGrams(d, item.id, Math.min(2000, grams), t))} format={value => t('g', { v0: formatNumber(value, locale) })} />}
    {flags.length > 0 && <div role="note"><p>{editorT('conflict', { name: item.food.name, reason: flagLabels(flags, editorT) })}</p>
      {item.alternatives.filter(alt => !flagFood(alt.food, facts).length && alt.grams >= 5 && alt.grams <= 2000).map(alt => <Button key={alt.id} variant="secondary" onClick={() => {
        update(d => ({ ...d, meals: d.meals.map(meal => ({ ...meal, items: meal.items.map(row => row.id === item.id ? { ...row, food: alt.food, grams: alt.grams, alternatives: row.alternatives.filter(value => value.id !== alt.id) } : row) })) }));
        toast.success({ title: success('swapped'), detail: success('foodDetail', { name: locale === 'en' ? alt.food.nameEn || alt.food.name : alt.food.name, grams: formatNumber(alt.grams, locale) }), icon: 'meal' });
      }}>{editorT('useAlternative', { name: alt.food.name })}</Button>)}
    </div>}
    {enhanced && missingNutrition(item.food) ? <p className="text-sm text-warn">{workspaceT('unknown')} · {workspaceT('incomplete')}</p>
      : <p className="text-sm text-muted">{formatNumber(macros.kcal, locale)}  {t('kcalProtein')} {formatNumber(macros.protein, locale)}  {t('carbs')} {formatNumber(macros.carbs, locale)}  {t('fat')} {formatNumber(macros.fat, locale)}</p>}
    <Button variant="secondary" aria-expanded={expanded} onClick={() => setExpanded(!expanded)}>{t('alternatives')}</Button>
    {expanded && <div className="grid gap-2">
      {!item.alternatives.length && !picking && <EmptyState icon={Utensils} title={t('noAlternativesYet')} body={t('searchHint')}
        action={{ label: t('addAlternative'), onClick: () => setPicking(true) }} />}
      <ul>{item.alternatives.map(alt => <li key={alt.id} className="flex items-center justify-between gap-2">
        <span>{alt.food.name} · {formatNumber(alt.grams, locale)}{t('gSameCalories')}</span>
        {captainWorkspaceEnabled() ? <IconButton className="border border-danger/40 text-danger!" aria-label={t('deleteAlternative', { v0: alt.food.name })} onClick={() => update(d => removeAlternative(d, item.id, alt.id))}><Trash2 aria-hidden /></IconButton> : <Button variant="ghost" aria-label={t('deleteAlternative', { v0: alt.food.name })} onClick={() => update(d => removeAlternative(d, item.id, alt.id))}><Trash2 aria-hidden /></Button>}
      </li>)}</ul>
      {(item.alternatives.length > 0 || picking) && <Button variant="secondary" onClick={() => setPicking(!picking)}>{picking ? t('closeSearch') : t('addAlternative')}</Button>}
      {picking && <FoodPicker alternative onPick={food => { const id = uuidv7(); update(d => addAlternative(d, item.id, food, id)); setPicking(false); }} />}
    </div>}
  </li>;
}

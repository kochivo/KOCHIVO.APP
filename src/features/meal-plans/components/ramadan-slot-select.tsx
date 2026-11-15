'use client';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { loadCaptainRamadanMode } from '../data/ramadan-mode';
import type { Meal } from '../types';
import { messages } from '../ramadan/messages';
export function RamadanSlotSelect({ meal, change }: { meal: Meal; change: (slot: Meal['ramadanSlot']) => void }) {
  const t = useT(messages), resource = useResource('meal-plans:ramadan:mode', loadCaptainRamadanMode);
  if (!resource.data) return null;
  return <label className="text-xs text-muted">{t('slot')}<select value={meal.ramadanSlot ?? ''}
    onChange={event => change(event.target.value === '' ? null : event.target.value as Meal['ramadanSlot'])}
    className="press min-h-12 cursor-pointer rounded-control border border-line bg-surface px-stack focus-visible:ring-2 focus-visible:ring-lime">
    <option value="">{t('automatic')}</option>{(['iftar','post_workout','suhoor'] as const).map(slot => <option key={slot} value={slot}>{t(slot)}</option>)}
  </select></label>;
}

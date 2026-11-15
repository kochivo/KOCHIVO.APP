'use client';
import { useCallback } from 'react';
import { useLocale } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { loadLightDay } from '../data/light-day';
import { LightDayChip } from './light-day-chip';
export function LightDayEntry({ playerId, date }: { playerId: string; date: string }) {
  const locale = useLocale();
  const load = useCallback(() => loadLightDay(playerId, date), [playerId, date]);
  const resource = useResource(`light-day:${playerId}:${date}`, load);
  return <LightDayChip light={resource.data === true} locale={locale} />;
}

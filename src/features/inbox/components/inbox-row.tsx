'use client';
import { formatDateAr } from '@/lib/dates';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { ageLabel } from '../merge';
import type { InboxItem } from '../types';

export function InboxRow({ item, now, selected, onSelect }: { item: InboxItem; now: Date; selected: boolean; onSelect: () => void }) {
  const t = useT(messages);
  const locale = useLocale();
  return <button id={`inbox-${item.kind}-${item.id}`} onClick={onSelect} aria-pressed={selected} className={`glass flex min-h-12 w-full gap-3 rounded-card p-4 text-start ${selected ? 'border-lime' : ''}`}>
    <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-surface-raised text-xl font-bold">{item.player_name.charAt(0)}</span>
    <span className="min-w-0 flex-1 space-y-2">
      <span className="flex flex-wrap justify-between gap-2"><strong>{item.player_name}</strong><span className="text-xs text-muted">{ageLabel(item.created_at, now, locale)}</span></span>
      <span className="block text-sm text-muted"><span className="text-lime">{item.kind === 'form' ? t('form') : t('checkin')}</span> · {item.kind === 'form' ? item.exercise_name : t('week', { date: formatDateAr(item.week_start, { day: 'numeric', month: 'long' }, locale) })}</span>
    </span>
  </button>;
}

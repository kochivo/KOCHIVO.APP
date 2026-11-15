'use client';
import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import type { CycleSettings } from '../data/cycle';
import { messages } from '../cycle/messages';
export function CycleSettingsForm({ value, onSave }: { value: CycleSettings; onSave: (patch: Partial<CycleSettings>) => Promise<unknown> | undefined }) {
  const t = useT(messages);
  const [draft, setDraft] = useState(value);
  const valid = [draft.avg_cycle_days, draft.avg_period_days, draft.light_days].every(Number.isInteger)
    && draft.avg_cycle_days >= 21 && draft.avg_cycle_days <= 40 && draft.avg_period_days >= 2 && draft.avg_period_days <= 10
    && draft.light_days >= 0 && draft.light_days <= 5;
  return <div className="space-y-stack"><h2 className="text-title font-semibold">{t('title')}</h2>
    {([{ key: 'enabled', label: 'title' }, { key: 'photos_captain', label: 'photosCaptain' }, { key: 'photos_share', label: 'photosShare' }] as const).map(({ key, label }) => <label key={key} className="flex min-h-12 cursor-pointer items-center justify-between gap-stack">
      {t(label)}<input type="checkbox" role="switch" className="size-6 cursor-pointer accent-lime focus-visible:ring-2 focus-visible:ring-lime" checked={draft[key]} onChange={event => setDraft({ ...draft, [key]: event.target.checked })} /></label>)}
    {([{ key: 'avg_cycle_days', label: 'cycleDays', min: 21, max: 40 }, { key: 'avg_period_days', label: 'periodDays', min: 2, max: 10 }, { key: 'light_days', label: 'lightDays', min: 0, max: 5 }] as const).map(field =>
      <label key={field.key} className="flex min-h-12 items-center justify-between gap-stack">{t(field.label)}<input type="number" min={field.min} max={field.max} value={draft[field.key]} className="min-h-12 w-20 rounded-control border border-line bg-surface px-stack" onChange={event => setDraft({ ...draft, [field.key]: Number(event.target.value) })} /></label>)}
    <Button variant="secondary" disabled={!valid} onClick={() => void onSave({ ...draft, asked_at: value.asked_at ?? new Date().toISOString() })}>{t('save')}</Button>
  </div>;
}

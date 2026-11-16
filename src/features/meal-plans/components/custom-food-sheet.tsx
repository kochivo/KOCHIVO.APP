'use client';

import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { IconButton } from '@/ui/icon-button';
import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { useToast } from '@/ui/toast';
import { messages } from '../messages';
import { customFoodSchema } from '../types';
import type { Food } from '../types';
import { saveCustomFood } from '../data/custom-food-photo';
import { messages as libraryMessages } from './library/v2/messages';

export function CustomFoodSheet({ onClose, onSave, openerId, alternative = false, food, onOptimistic, initialName }: {
  onClose: () => void; onSave: (food: Food, grams: number) => void; openerId: string; alternative?: boolean;
  food?: Food; onOptimistic?: (food: Food) => () => void; initialName?: string;
}) {
  const t = useT(messages);
  const libraryT = useT(libraryMessages);
  const toast = useToast();
  const titleId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [live, setLive] = useState({ name: food?.name ?? initialName ?? '', kcal: food?.kcal ?? 0,
    protein: food?.protein ?? 0, carbs: food?.carbs ?? 0, fat: food?.fat ?? 0 });
  const saving = useRef(false);
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    const form = new FormData(event.currentTarget);
    const value = customFoodSchema.safeParse({ name: form.get('name'), fiber: form.get('fiber') === '' ? null : Number(form.get('fiber')),
      ...Object.fromEntries(['servingGrams', 'kcal', 'protein', 'carbs', 'fat'].map(key => [key, Number(form.get(key))])) });
    if (!value.success) { setError(t('invalidCustomFood')); return; }
    if (alternative && value.data.kcal <= 0) { setError(t('alternativeNeedsCalories')); return; }
    saving.current = true;
    setBusy(true); setError('');
    const per100 = (number: number) => Math.round(number / value.data.servingGrams * 1000) / 10;
    const rollback = food && onOptimistic?.({ ...food, name: value.data.name,
      kcal: per100(value.data.kcal), protein: per100(value.data.protein),
      carbs: per100(value.data.carbs), fat: per100(value.data.fat), fiber_per_100g: value.data.fiber == null ? null : per100(value.data.fiber) });
    try {
      const saved = await saveCustomFood(value.data, file, t, food?.id);
      if (!saved.ok) { rollback?.(); setError(saved.error); toast.error(saved.error); return; }
      onSave(saved.data, value.data.servingGrams);
      toast.success(t('customFoodSaved'));
    } catch {
      rollback?.();
      setError(t('couldntSaveTryAgain'));
      toast.error(t('couldntSaveTryAgain'));
    } finally { saving.current = false; setBusy(false); }
  }
  const fields = [
    { name: 'servingGrams', label: t('servingGrams'), min: 5, max: 2000, value: 100 },
    { name: 'kcal', label: t('calories'), min: alternative ? 0.1 : 0, max: 5000, value: food?.kcal ?? 0 },
    { name: 'protein', label: t('protein'), min: 0, max: 1000, value: food?.protein ?? 0 },
    { name: 'carbs', label: t('carbs2'), min: 0, max: 1000, value: food?.carbs ?? 0 },
    { name: 'fat', label: t('fat2'), min: 0, max: 1000, value: food?.fat ?? 0 },
  ];
  const calculated = live.protein * 4 + live.carbs * 4 + live.fat * 9;
  return <ResponsiveDialog modal fallbackId={openerId} openerId={openerId} onDismiss={() => { if (!saving.current) onClose(); }}
    aria-labelledby={titleId} className="sheet fixed inset-0 z-50 m-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-card p-card text-ink">
    <div className="flex items-center justify-between gap-stack">
      <h2 id={titleId} className="text-xl font-bold">{food ? t('editFood') : t('newFood')}</h2>
      {captainWorkspaceEnabled() ? <IconButton disabled={busy} aria-label={t('close')} onClick={onClose}><X aria-hidden /></IconButton> : <Button variant="ghost" disabled={busy} aria-label={t('close')} onClick={onClose}><X aria-hidden /></Button>}
    </div>
    <form onSubmit={event => void submit(event)} onChange={event => {
      const form = new FormData(event.currentTarget), weight = Math.max(1, Number(form.get('servingGrams')));
      const per100 = (key: string) => Number(form.get(key)) / weight * 100;
      setLive({ name: String(form.get('name') ?? ''), kcal: per100('kcal'), protein: per100('protein'), carbs: per100('carbs'), fat: per100('fat') });
    }} className="mt-card-gap grid gap-card-gap" aria-busy={busy}>
      <fieldset disabled={busy} className="grid gap-stack">
        <label className="grid gap-inline">{t('foodName')}<input name="name" required maxLength={60} defaultValue={food?.name ?? initialName?.slice(0, 60)}
          className="min-h-12 rounded-control border border-line bg-surface px-stack" /></label>
        <p className="text-sm text-muted">{t('servingMacros')}</p>
        {fields.map(field => <label key={field.name} className="grid gap-inline">{field.label}
          <input name={field.name} type="number" required min={field.min} max={field.max} step="0.1" defaultValue={field.value}
            className="min-h-12 rounded-control border border-line bg-surface px-stack" />
        </label>)}
        <label className="grid gap-inline">{libraryT('fiber')}<input name="fiber" type="number" min={0} max={100} step="0.1" defaultValue={food?.fiber_per_100g ?? ''} className="min-h-12 rounded-control border border-line bg-surface px-stack" /></label>
        <label className="grid gap-inline">{t('optionalPhoto')}<input type="file" accept="image/*" className="min-h-12"
          onChange={event => {
            const next = event.target.files?.[0] ?? null;
            setFile(next); setPreview(next ? URL.createObjectURL(next) : '');
          }} /></label>
        {/* The preview is a temporary local object URL. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {preview && <img src={preview} alt={t('optionalPhoto')} width={160} height={160} className="size-40 rounded-control object-cover" />}
      </fieldset>
      <section className="glass-strong grid gap-stack rounded-control p-card"><h3 className="font-bold">{live.name}</h3><p className="text-xs text-muted">{libraryT('per100')}</p><dl className="grid grid-cols-4 gap-inline">{(['kcal', 'protein', 'carbs', 'fat'] as const).map(key => <div key={key}><dt className="text-xs text-muted">{t(({ kcal: 'calories', protein: 'protein', carbs: 'carbs2', fat: 'fat2' } as const)[key])}</dt><dd className="font-display text-title">{Math.round(live[key] * 10) / 10}</dd></div>)}</dl></section>
      {Math.abs(calculated - live.kcal) > live.kcal * 0.15 && <p role="status" className="text-warn">{libraryT('mismatch', { kcal: Math.round(live.kcal), calculated: Math.round(calculated) })}</p>}
      {error && <p role="alert" className="text-danger">{error}</p>}
      {busy && <p role="status">{t('saving')}</p>}
      <Button type="submit" disabled={busy}>{food ? t('saveFood') : t('saveAndAdd')}</Button>
    </form>
  </ResponsiveDialog>;
}

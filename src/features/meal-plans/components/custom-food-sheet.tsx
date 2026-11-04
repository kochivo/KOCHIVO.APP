'use client';

import { useEffect, useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { useToast } from '@/ui/toast';
import { messages } from '../messages';
import { customFoodSchema } from '../types';
import type { Food } from '../types';
import { saveCustomFood } from '../data/custom-food-photo';

export function CustomFoodSheet({ onClose, onSave, openerId, alternative = false, food, onOptimistic }: {
  onClose: () => void; onSave: (food: Food, grams: number) => void; openerId: string; alternative?: boolean;
  food?: Food; onOptimistic?: (food: Food) => () => void;
}) {
  const t = useT(messages);
  const toast = useToast();
  const titleId = useId();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const saving = useRef(false);
  useEffect(() => {
    return () => { if (preview) URL.revokeObjectURL(preview); };
  }, [preview]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (saving.current) return;
    const form = new FormData(event.currentTarget);
    const value = customFoodSchema.safeParse({ name: form.get('name'),
      ...Object.fromEntries(['servingGrams', 'kcal', 'protein', 'carbs', 'fat'].map(key => [key, Number(form.get(key))])) });
    if (!value.success) { setError(t('invalidCustomFood')); return; }
    if (alternative && value.data.kcal <= 0) { setError(t('alternativeNeedsCalories')); return; }
    saving.current = true;
    setBusy(true); setError('');
    const per100 = (number: number) => Math.round(number / value.data.servingGrams * 1000) / 10;
    const rollback = food && onOptimistic?.({ ...food, name: value.data.name,
      kcal: per100(value.data.kcal), protein: per100(value.data.protein),
      carbs: per100(value.data.carbs), fat: per100(value.data.fat) });
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
  return <ResponsiveDialog fallbackId={openerId} openerId={openerId} onDismiss={() => { if (!saving.current) onClose(); }}
    aria-labelledby={titleId} className="glass-strong fixed inset-0 z-50 m-auto max-h-dvh w-full max-w-lg overflow-y-auto rounded-card p-5 text-ink">
    <div className="flex items-center justify-between gap-3">
      <h2 id={titleId} className="text-xl font-bold">{food ? t('editFood') : t('newFood')}</h2>
      <Button variant="ghost" disabled={busy} aria-label={t('close')} onClick={onClose}><X aria-hidden /></Button>
    </div>
    <form onSubmit={event => void submit(event)} className="mt-4 grid gap-4" aria-busy={busy}>
      <fieldset disabled={busy} className="grid gap-3">
        <label className="grid gap-1">{t('foodName')}<input name="name" required maxLength={60} defaultValue={food?.name}
          className="min-h-12 rounded-control border border-line bg-surface px-3" /></label>
        <p className="text-sm text-muted">{t('servingMacros')}</p>
        {fields.map(field => <label key={field.name} className="grid gap-1">{field.label}
          <input name={field.name} type="number" required min={field.min} max={field.max} step="0.1" defaultValue={field.value}
            className="min-h-12 rounded-control border border-line bg-surface px-3" />
        </label>)}
        <label className="grid gap-1">{t('optionalPhoto')}<input type="file" accept="image/*" className="min-h-12"
          onChange={event => {
            const next = event.target.files?.[0] ?? null;
            setFile(next); setPreview(next ? URL.createObjectURL(next) : '');
          }} /></label>
        {/* The preview is a temporary local object URL. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        {preview && <img src={preview} alt={t('optionalPhoto')} width={160} height={160} className="size-40 rounded-control object-cover" />}
      </fieldset>
      {error && <p role="alert" className="text-danger">{error}</p>}
      {busy && <p role="status">{t('saving')}</p>}
      <Button type="submit" disabled={busy}>{food ? t('saveFood') : t('saveAndAdd')}</Button>
    </form>
  </ResponsiveDialog>;
}

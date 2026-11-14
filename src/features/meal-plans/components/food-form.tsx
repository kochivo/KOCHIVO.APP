'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useT } from '@/core/i18n/client';
import { foodPhotoUrl } from '@/core/storage/media-url';
import { resourceStore } from '@/core/resource/store';
import { Button } from '@/ui/button';
import { KoCamera } from '@/ui/icons/ko-camera';
import { KoSend } from '@/ui/icons/ko-send';
import { useToast } from '@/ui/toast';
import { saveCustomFood } from '../data/custom-food-photo';
import type { LibraryPage } from '../data/library-types';
import type { Macros } from '@/lib/macros';
import { checkMacros } from '../macro-check';
import { foodFormMessages, messages } from '../messages';
import { customFoodSchema } from '../types';
import type { Food, FoodUnit } from '../types';
import { FoodUnitsEditor } from './food-units-editor';
import { FoodPreview } from './food-preview';

export function foodFormInput(value: Macros & { name: string; nameEn: string; units: FoodUnit[]; copyFrom?: string }) {
  return customFoodSchema.parse({ ...value, servingGrams: 100,
    units: value.units.map(unit => ({ ...unit, name_en: unit.name_en.trim() || unit.name_ar.trim() })) });
}

export function FoodForm({ food, copyFrom, initialName = '', onSaved, onCancel, onBusyChange, returnTo }: {
  food?: Food; copyFrom?: string; initialName?: string; returnTo?: string;
  onSaved?: (food: Food, grams: number) => void; onCancel?: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const t = useT(foodFormMessages);
  const planT = useT(messages);
  const locale = useLocale();
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState(food?.name ?? initialName.slice(0, 60));
  const [nameEn, setNameEn] = useState(food?.nameEn ?? '');
  const [macros, setMacros] = useState({ kcal: food?.kcal ?? 0, protein: food?.protein ?? 0, carbs: food?.carbs ?? 0, fat: food?.fat ?? 0 });
  const [units, setUnits] = useState(food?.units ?? []);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const home = `/${locale}/captain/library/foods`;
  // Only return to a captain route in the current locale.
  const destination = typeof returnTo === 'string' && returnTo.startsWith(`/${locale}/captain/`) && !returnTo.includes('\\') ? returnTo : home;
  const copyId = copyFrom ?? (food && !food.custom ? food.id : undefined);
  const id = food?.custom && !copyId ? food.id : undefined;
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (lock.current) return;
    let input;
    try { input = foodFormInput({ name, nameEn, ...macros, units, ...(copyId ? { copyFrom: copyId } : {}) }); }
    catch { setError(planT('invalidCustomFood')); return; }
    lock.current = true; setBusy(true); setError(''); onBusyChange?.(true);
    try {
      const result = await saveCustomFood(input, file, planT, id);
      if (!result.ok) { setError(result.error); return; }
      for (const segment of ['all', 'mine']) {
        void resourceStore.mutate<LibraryPage>(`foods-library:${JSON.stringify(['', segment, null])}`, current => {
          const page = current ?? { foods: [], cursor: null, counts: { all: 0, mine: 0, global: 0 } };
          const existing = page.foods.find(row => row.id === result.data.id);
          const next = { ...existing, ...result.data, uses: existing?.uses ?? 0 };
          const foods = existing ? page.foods.map(row => row.id === next.id ? next : row)
            : id && current ? page.foods : [next, ...page.foods].slice(0, 40);
          const delta = id ? 0 : 1;
          return { ...page, foods, counts: { ...page.counts, all: page.counts.all + delta, mine: page.counts.mine + delta } };
        }, async () => {});
      }
      toast.success(t('saved', { name: result.data.name }));
      if (onSaved) onSaved(result.data, units[0]?.grams ?? 100);
      else { router.replace(destination); router.refresh(); }
    } catch { setError(planT('couldntSaveTryAgain')); }
    finally { lock.current = false; setBusy(false); onBusyChange?.(false); }
  }
  const check = checkMacros(macros);
  const macroLabels = { kcal: 'calories', protein: 'protein', carbs: 'carbs2', fat: 'fat2' } as const;
  const photo = preview || (food?.photo ? foodPhotoUrl(food.photo) : null);
  const inputClass = 'min-h-12 w-full min-w-0 rounded-control border border-line bg-surface px-3';
  return <form onSubmit={event => void submit(event)} className="grid gap-4 text-ink" aria-busy={busy}>
    <header className="glass flex flex-wrap items-center gap-3 rounded-card p-4">
      <div className="me-auto"><h1 className="font-display text-2xl font-bold">{id ? planT('editFood') : t('title')}</h1><p className="text-sm text-muted">{t('subtitle')}</p></div>
      <Button variant="secondary" type="button" disabled={busy} onClick={() => onCancel ? onCancel() : router.replace(destination)}>{t('cancel')}</Button>
      <Button type="submit" disabled={busy}><KoSend aria-hidden className="size-5" />{busy ? planT('saving') : t('save')}</Button>
    </header>
    {error && <p role="alert" className="text-danger">{error}</p>}
    {busy && <p role="status">{planT('saving')}</p>}
    <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
      <fieldset disabled={busy} className="grid min-w-0 gap-4">
        <section className="glass grid gap-4 rounded-card p-5">
          <h2 className="font-bold">{t('identity')}</h2>
          <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-3 sm:grid-cols-[128px_minmax(0,1fr)]">
            <label className="flex min-h-12 cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-control border border-dashed border-line p-2 text-center text-sm text-muted focus-within:ring-2 focus-within:ring-lime">
              {/* This preview uses the existing public bucket or a local object URL. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {photo ? <img src={photo} alt={name} width={128} height={128} className="size-24 rounded-control object-cover" /> : <KoCamera aria-hidden className="size-8" />}
              {planT('optionalPhoto')}<input className="sr-only" type="file" accept="image/*" onChange={event => {
                const next = event.target.files?.[0] ?? null;
                setFile(next); setPreview(next ? URL.createObjectURL(next) : '');
              }} />
            </label>
            <div className="grid gap-3">
              <label className="grid gap-1 text-sm">{t('nameAr')}<input className={inputClass} required maxLength={60} value={name} onChange={event => setName(event.target.value)} /></label>
              <label className="grid gap-1 text-sm">{t('nameEn')}<input className={inputClass} dir="ltr" maxLength={100} value={nameEn} onChange={event => setNameEn(event.target.value)} /></label>
            </div>
          </div>
        </section>
        <section className="glass grid gap-4 rounded-card p-5">
          <div className="flex flex-wrap justify-between gap-2"><h2 className="font-bold">{t('nutrition')}</h2><p className="text-sm text-muted">{t('per100')}</p></div>
          <div className="glass-strong grid grid-cols-2 gap-3 rounded-control p-3 sm:grid-cols-4">
            {(['kcal', 'protein', 'carbs', 'fat'] as const).map(key => <label className="grid min-w-0 gap-1 text-sm" key={key}>
              {planT(macroLabels[key])}
              <input className={inputClass} required type="number" min={0} max={key === 'kcal' ? 900 : 100} step="0.1" value={macros[key]}
                onChange={event => setMacros({ ...macros, [key]: Number(event.target.value) })} />
            </label>)}
          </div>
          <p role="status" className={`rounded-control p-3 text-sm ${check.warn ? 'bg-warn/10 text-warn' : 'bg-lime/10 text-lime'}`}>
            {check.warn ? t('warn', { calculated: Math.round(check.calculated), kcal: macros.kcal }) : t('ok')}
          </p>
        </section>
        <FoodUnitsEditor units={units} kcal={macros.kcal} onChange={setUnits} />
      </fieldset>
      <FoodPreview name={name} nameEn={nameEn} macros={macros} units={units} photo={photo} />
    </div>
  </form>;
}

'use client';
import { NumberInput } from '@/ui/number-input';

import { editableFieldClass } from '@/ui/edit-in-place';
import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useT } from '@/core/i18n/client';
import { foodPhotoUrl } from '@/core/storage/media-url';
import { uuidv7 } from '@/core/offline/ids';
import { Button } from '@/ui/button';
import { KoCamera } from '@/ui/icons/ko-camera';
import { KoSend } from '@/ui/icons/ko-send';
import { useToast } from '@/ui/toast';
import { saveCustomFood } from '../data/custom-food-photo';
import { saveFoodWithCache } from '../data/food-library-cache';
import type { Macros } from '@/lib/macros';
import { checkMacros } from '../macro-check';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { foodFormMessages, messages } from '../messages';
import { customFoodSchema } from '../types';
import type { Food, FoodUnit } from '../types';
import { FoodUnitsEditor } from './food-units-editor';
import { FoodPreview } from './food-preview';
import { messages as libraryV2Messages } from './library/v2/messages';

export function foodFormInput(value: Macros & { name: string; nameEn: string; units: FoodUnit[]; copyFrom?: string; fiber?: number | null }) {
  return customFoodSchema.parse({ ...value, servingGrams: 100,
    units: value.units.map(unit => ({ ...unit, name_en: unit.name_en.trim() || unit.name_ar.trim() })) });
}

export function FoodForm({ food, copyFrom, initialName = '', onSaved, onCancel, onBusyChange, returnTo }: {
  food?: Food; copyFrom?: string; initialName?: string; returnTo?: string;
  onSaved?: (food: Food, grams: number) => void; onCancel?: () => void;
  onBusyChange?: (busy: boolean) => void;
}) {
  const t = useT(foodFormMessages);
  const libraryT = useT(libraryV2Messages);
  const [fiber, setFiber] = useState<number | null>(food?.fiber_per_100g ?? null);
  const workspace = captainWorkspaceEnabled();
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
    try { input = foodFormInput({ name, nameEn, ...macros, fiber, units, ...(copyId ? { copyFrom: copyId } : {}) }); }
    catch { setError(planT('invalidCustomFood')); return; }
    lock.current = true; setBusy(true); setError(''); onBusyChange?.(true);
    try {
      const optimistic: Food = { ...food, id: id ?? uuidv7(), name, nameEn, units, ...macros,
        fiber_per_100g: fiber, source_kind: null, source_ref: null,
        custom: true, photo: food?.photo ?? null, ...(copyId ? { replacesId: copyId } : {}) };
      const result = await saveFoodWithCache(optimistic, saveCustomFood(input, file, planT, id), id);
      if (!result.ok) { setError(result.error); return; }
      toast.success(t('saved', { name: result.data.name }));
      if (onSaved) onSaved(result.data, units[0]?.grams ?? 100);
      else { router.replace(destination); router.refresh(); }
    } catch { setError(planT('couldntSaveTryAgain')); }
    finally { lock.current = false; setBusy(false); onBusyChange?.(false); }
  }
  const check = { ...checkMacros(macros), warn: Math.abs(4 * macros.protein + 4 * macros.carbs + 9 * macros.fat - macros.kcal) > macros.kcal * 0.15 };
  const macroLabels = { kcal: 'calories', protein: 'protein', carbs: 'carbs2', fat: 'fat2' } as const;
  const photo = preview || (food?.photo ? foodPhotoUrl(food.photo) : null);
  const inputClass = 'min-h-12 w-full min-w-0 rounded-control border border-line bg-surface px-stack';
  return <form onSubmit={event => void submit(event)} className="grid gap-card-gap text-ink" aria-busy={busy}>
    <header className={workspace ? 'glass flex flex-wrap items-center gap-stack rounded-card p-stack' : 'glass flex flex-wrap items-center gap-stack rounded-card p-card'}>
      {workspace && <Button variant="secondary" type="button" disabled={busy} aria-label={t('cancel')} onClick={() => onCancel ? onCancel() : router.replace(destination)}><KoSend aria-hidden className="size-4 rotate-45 ltr:rotate-225" /></Button>}
      <div className="me-auto min-w-0"><h1 className={workspace ? 'text-md font-bold' : 'font-display text-2xl font-bold'}>{id || copyId ? planT('editFood') : t('title')}</h1><p className={workspace ? 'text-xs text-muted' : 'text-sm text-muted'}>{t('subtitle')}</p></div>
      <Button className={workspace ? 'hidden min-[761px]:inline-flex' : undefined} variant="secondary" type="button" disabled={busy} onClick={() => onCancel ? onCancel() : router.replace(destination)}>{t('cancel')}</Button>
      <Button type="submit" disabled={busy}><KoSend aria-hidden className="size-5" />{busy ? planT('saving') : t('save')}</Button>
    </header>
    {error && <p role="alert" className="text-danger">{error}</p>}
    {busy && <p role="status">{planT('saving')}</p>}
    <div className={workspace ? 'grid items-start gap-stack min-[761px]:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]' : 'grid items-start gap-card-gap lg:grid-cols-[minmax(0,1fr)_320px]'}>
      <fieldset disabled={busy} className={workspace ? 'grid min-w-0 gap-stack' : 'grid min-w-0 gap-card-gap'}>
        <section className={workspace ? 'glass grid gap-stack rounded-card p-card' : 'glass grid gap-card-gap rounded-card p-card'}>
          <h2 className="font-bold">{t('identity')}</h2>
          <div className="grid grid-cols-[96px_minmax(0,1fr)] gap-stack sm:grid-cols-[128px_minmax(0,1fr)]">
            <label className="flex min-h-12 cursor-pointer flex-col items-center justify-center gap-inline overflow-hidden rounded-control border border-dashed border-line p-inline text-center text-sm text-muted focus-within:ring-2 focus-within:ring-lime">
              {/* This preview uses the existing public bucket or a local object URL. */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              {photo ? <img src={photo} alt={name} width={128} height={128} className="size-24 rounded-control object-cover" /> : <KoCamera aria-hidden className="size-8" />}
              {planT('optionalPhoto')}<input className={captainWorkspaceEnabled() ? `${editableFieldClass} sr-only` : "sr-only"} type="file" accept="image/*" onChange={event => {
                const next = event.target.files?.[0] ?? null;
                setFile(next); setPreview(next ? URL.createObjectURL(next) : '');
              }} />
            </label>
            <div className="grid gap-stack">
              <label className="grid gap-inline text-sm">{t('nameAr')}<input className={captainWorkspaceEnabled() ? `${editableFieldClass} ${inputClass}` : inputClass} required maxLength={60} value={name} onChange={event => setName(event.target.value)} /></label>
              <label className="grid gap-inline text-sm">{t('nameEn')}<input className={captainWorkspaceEnabled() ? `${editableFieldClass} ${inputClass}` : inputClass} dir="ltr" maxLength={100} value={nameEn} onChange={event => setNameEn(event.target.value)} /></label>
            </div>
          </div>
        </section>
        <section className={workspace ? 'glass grid gap-stack rounded-card p-card' : 'glass grid gap-card-gap rounded-card p-card'}>
          <div className="flex flex-wrap justify-between gap-inline"><h2 className="font-bold">{t('nutrition')}</h2><p className="text-sm text-muted">{t('per100')}</p></div>
          <div className={workspace ? 'grid grid-cols-2 gap-stack sm:grid-cols-4' : 'glass-strong grid grid-cols-2 gap-stack rounded-control p-stack sm:grid-cols-4'}>
            {(['kcal', 'protein', 'carbs', 'fat'] as const).map(key => <label className="grid min-w-0 gap-inline text-sm" key={key}>
              {planT(macroLabels[key])}
              <NumberInput className={captainWorkspaceEnabled() ? `${editableFieldClass} ${inputClass}` : inputClass} required min={0} max={key === 'kcal' ? 900 : 100} step="0.1" value={macros[key]}
                onCommit={value => setMacros({ ...macros, [key]: value })} />
            </label>)}
          </div>
          <label className="grid gap-inline text-sm">{libraryT('fiber')}<NumberInput allowEmpty className={inputClass} min={0} max={100} step="0.1" value={fiber ?? ''} onCommit={value => setFiber(value === null ? null : value)} /></label>
          <p role="status" className={`rounded-control p-stack text-sm ${check.warn ? 'bg-warn/10 text-warn' : 'bg-lime/10 text-lime'}`}>
            {check.warn ? t('warn', { calculated: Math.round(check.calculated), kcal: macros.kcal }) : t('ok')}
          </p>
        </section>
        <FoodUnitsEditor units={units} kcal={macros.kcal} onChange={setUnits} />
      </fieldset>
      <FoodPreview name={name} nameEn={nameEn} macros={macros} units={units} photo={photo} />
    </div>
  </form>;
}

'use client';

import { Button } from '@/ui/button';
import { IconButton } from '@/ui/icon-button';
import { useId, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { foodPhotoUrl } from '@/core/storage/media-url';
import { uuidv7 } from '@/core/offline/ids';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { customFoodSchema } from '../../types';
import type { Food } from '../../types';
import type { LibraryFood } from '../../data/library-types';
import { saveCustomFood } from '../../data/custom-food-photo';
import { checkFoodDuplicate, deleteLibraryFood } from '../../data/food-library';
import { kcalMismatch } from '../../food-library-rules';
import { messages as foodMessages } from '../../messages';
import { messages } from './messages';
import { FoodUnits } from './food-units';

export function FoodDrawer({ food, onClose, onSaved, onMutation }: {
  food: LibraryFood | null; onClose: () => void; onSaved: (food?: Food, optimisticId?: string) => void;
  onMutation?: (next: Food | undefined, commit: () => Promise<void>) => Promise<boolean>;
}) {
  const t = useT(messages);
  const foodT = useT(foodMessages);
  const title = useId();
  const [copy, setCopy] = useState(false);
  const readonly = Boolean(food && !food.custom && !copy);
  const [name, setName] = useState(food?.name ?? '');
  const [nameEn, setNameEn] = useState(food?.nameEn ?? '');
  const [macros, setMacros] = useState({ kcal: food?.kcal ?? 0, protein: food?.protein ?? 0, carbs: food?.carbs ?? 0, fat: food?.fat ?? 0 });
  const [units, setUnits] = useState(food?.units ?? []);
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [duplicate, setDuplicate] = useState(false);
  const [acknowledged, setAcknowledged] = useState('');
  const lock = useRef(false);
  const id = food?.custom && !copy ? food.id : undefined;
  const uses = (food?.uses ?? 0) + (food?.alternativeUses ?? 0);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (readonly || lock.current) return;
    const parsed = customFoodSchema.safeParse({ name, nameEn, servingGrams: 100, ...macros, units,
      ...(copy && food ? { copyFrom: food.id } : {}) });
    if (!parsed.success) { setError(foodT('invalidCustomFood')); return; }
    lock.current = true; setBusy(true); setError('');
    try {
      const check = await checkFoodDuplicate(name, nameEn, id);
      if (!check.ok) { setError(check.error); return; }
      const signature = JSON.stringify([name, nameEn]);
      setDuplicate(check.data);
      if (check.data && acknowledged !== signature) { setAcknowledged(signature); return; }
      const next = { id: id ?? uuidv7(), name, nameEn, ...macros, units, custom: true, photo: food?.photo ?? null };
      const commit = async () => {
        const result = await saveCustomFood(parsed.data, file, foodT, id);
        if (!result.ok) { setError(result.error); throw new Error(result.error); }
        onSaved(result.data, next.id);
      };
      if (onMutation) await onMutation(next, commit); else await commit();
    } catch { setError(foodT('couldntSaveTryAgain')); }
    finally { lock.current = false; setBusy(false); }
  }
  async function remove() {
    if (!id || lock.current || !window.confirm(t('confirmDelete'))) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const commit = async () => {
        const result = await deleteLibraryFood(id);
        if (!result.ok) { setError(result.error); throw new Error(result.error); }
        onSaved();
      };
      if (onMutation) await onMutation(undefined, commit); else await commit();
    } catch { setError(foodT('foodDeleteFailed')); }
    finally { lock.current = false; setBusy(false); }
  }
  const input = 'min-h-12 w-full rounded-control border border-line bg-surface px-3';
  const photo = food?.photo ? foodPhotoUrl(food.photo) : null;
  return <ResponsiveDialog modal fallbackId="new-library-food" onDismiss={() => { if (!busy) onClose(); }} aria-labelledby={title}
    className="sheet fixed inset-x-0 bottom-0 top-auto z-50 max-h-[90dvh] w-full overflow-y-auto rounded-t-card p-5 text-ink lg:inset-x-auto lg:inset-y-4 lg:end-0 lg:m-0 lg:h-auto lg:max-h-[90dvh] lg:w-[26rem] lg:rounded-none lg:border-s lg:border-line">
    <div className="flex items-center justify-between gap-3">
      <h2 id={title} className="text-xl font-bold">{food?.name ?? t('new')}</h2>
      <IconButton type="button" disabled={busy} className="min-h-12 min-w-12" aria-label={t('close')} onClick={onClose}><X aria-hidden /></IconButton>
    </div>
    {readonly && <p className="my-3 text-muted">{t('readonly')}</p>}
    <form onSubmit={event => void submit(event)} className="mt-4 grid gap-4" aria-busy={busy}>
      <fieldset disabled={readonly || busy} className="grid gap-3">
        <label>{t('name')}<input className={input} required maxLength={60} value={name} onChange={e => { setName(e.target.value); setDuplicate(false); }} /></label>
        <label>{t('nameEn')}<input dir="ltr" className={input} maxLength={100} value={nameEn} onChange={e => { setNameEn(e.target.value); setDuplicate(false); }} /></label>
        <p className="text-sm text-muted">{t('per100')}</p>
        <div className="glass-strong grid grid-cols-2 gap-3 rounded-control p-3">{(['kcal', 'protein', 'carbs', 'fat'] as const).map(key => <label key={key}>{t(key)}
          <input className={input} required type="number" min={0} max={key === 'kcal' ? 900 : 100} step="0.1" value={macros[key]}
            onChange={e => setMacros({ ...macros, [key]: Number(e.target.value) })} />
        </label>)}</div>
        <FoodUnits units={units} onChange={setUnits} disabled={readonly || busy} />
        {!readonly && <label>{t('photo')}<input className="min-h-12 w-full" type="file" accept="image/*" onChange={e => setFile(e.target.files?.[0] ?? null)} /></label>}
      </fieldset>
      {/* Food photos are served by the existing public food storage buckets. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {photo && <img src={photo} alt={name} width={160} height={160} className="size-40 rounded-control object-cover" />}
      {kcalMismatch(macros) && <p role="status" className="text-warn">{t('mismatch')}</p>}
      {duplicate && <p role="status" className="text-warn">{t('duplicate')}</p>}
      {error && <p role="alert" className="text-danger">{error}</p>}
      {busy && <p role="status">{t('saving')}</p>}
      {readonly ? <button type="button" className="min-h-12 rounded-control bg-lime px-4 text-on-lime" onClick={() => setCopy(true)}>{t('copy')}</button>
        : <button type="submit" disabled={busy} className="min-h-12 rounded-control bg-lime px-4 font-bold text-on-lime">{t('save')}</button>}
      {id && <>
        {uses > 0 && <p className="text-muted">{t('blocked', { count: uses })}</p>}
        <Button variant="secondary" type="button" disabled={busy || uses > 0} className="min-h-12 border border-danger/40 text-danger! disabled:opacity-50" onClick={() => void remove()}>{t('delete')}</Button>
      </>}
    </form>
  </ResponsiveDialog>;
}

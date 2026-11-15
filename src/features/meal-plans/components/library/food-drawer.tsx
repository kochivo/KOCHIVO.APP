'use client';

import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { editableFieldClass } from '@/ui/edit-in-place';
import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { foodPhotoUrl } from '@/core/storage/media-url';
import { Button, buttonClass } from '@/ui/button';
import { IconButton } from '@/ui/icon-button';
import { LoadingState } from '@/ui/loading-state';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import type { Food } from '../../types';
import type { LibraryFood } from '../../data/library-types';
import { deleteLibraryFood } from '../../data/food-library';
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
  const locale = useLocale();
  const router = useRouter();
  const title = useId();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);
  const base = `/${locale}/captain/library/foods`;
  useEffect(() => {
    if (!food && !lock.current) { lock.current = true; onClose(); router.push(`${base}/new`); }
  }, [food, onClose, router, base]);
  const id = food?.custom ? food.id : undefined;
  const uses = (food?.uses ?? 0) + (food?.alternativeUses ?? 0);
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
  if (!food) return <LoadingState variant="detail" />;
  const input = 'min-h-12 w-full rounded-control border border-line bg-surface px-3';
  const photo = food.photo ? foodPhotoUrl(food.photo) : null;
  return <ResponsiveDialog modal fallbackId="new-library-food" onDismiss={() => { if (!busy) onClose(); }} aria-labelledby={title}
    className="sheet fixed inset-x-0 bottom-0 top-auto z-50 max-h-[90dvh] w-full overflow-y-auto rounded-t-card p-5 text-ink lg:inset-x-auto lg:inset-y-4 lg:end-0 lg:m-0 lg:h-auto lg:max-h-[90dvh] lg:w-[26rem] lg:rounded-none lg:border-s lg:border-line">
    <div className="flex items-center justify-between gap-3">
      <h2 id={title} className="text-xl font-bold">{food.name}</h2>
      <IconButton type="button" disabled={busy} aria-label={t('close')} onClick={onClose}><X aria-hidden /></IconButton>
    </div>
    {!food.custom && <p className="my-3 text-muted">{t('readonly')}</p>}
    <div className="mt-4 grid gap-4" aria-busy={busy}>
      <fieldset disabled className="grid gap-3">
        <label>{t('name')}<input className={captainWorkspaceEnabled() ? `${editableFieldClass} ${input}` : input} value={food.name} readOnly /></label>
        <label>{t('nameEn')}<input dir="ltr" className={captainWorkspaceEnabled() ? `${editableFieldClass} ${input}` : input} value={food.nameEn ?? ''} readOnly /></label>
        <p className="text-sm text-muted">{t('per100')}</p>
        <div className="glass-strong grid grid-cols-2 gap-3 rounded-control p-3">{(['kcal', 'protein', 'carbs', 'fat'] as const).map(key => <label key={key}>{t(key)}
          <input className={captainWorkspaceEnabled() ? `${editableFieldClass} ${input}` : input} type="number" value={food[key]} readOnly />
        </label>)}</div>
        <FoodUnits units={food.units ?? []} onChange={() => {}} disabled />
      </fieldset>
      {/* Food photos are served by the existing public food storage buckets. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {photo && <img src={photo} alt={food.name} width={160} height={160} className="size-40 rounded-control object-cover" />}
      {kcalMismatch(food) && <p role="status" className="text-warn">{t('mismatch')}</p>}
      {error && <p role="alert" className="text-danger">{error}</p>}
      {busy && <p role="status">{t('saving')}</p>}
      {!busy && <Link onClick={onClose} className={buttonClass({ variant: 'primary', block: false, className: "flex min-h-12 items-center justify-center px-4 font-bold" })}
        href={id ? `${base}/${id}/edit` : `${base}/new?copyFrom=${food.id}`}>{id ? foodT('editFood') : t('copy')}</Link>}
      {id && <>
        {uses > 0 && <p className="text-muted">{t('blocked', { count: uses })}</p>}
        <Button variant="secondary" type="button" disabled={busy || uses > 0} className="min-h-12 border border-danger/40 text-danger! disabled:opacity-50" onClick={() => void remove()}>{t('delete')}</Button>
      </>}
    </div>
  </ResponsiveDialog>;
}

'use client';

import { useEffect, useId, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { Button, buttonClass } from '@/ui/button';
import { IconButton } from '@/ui/icon-button';
import { LoadingState } from '@/ui/loading-state';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import type { Food } from '../../types';
import type { LibraryFood } from '../../data/library-types';
import { deleteLibraryFood, restoreLibraryFood } from '../../data/food-library';
import { invalidateFoodResources } from '../../data/food-resource-version';
import { messages as foodMessages } from '../../messages';
import { messages } from './messages';
import { FoodFacts } from './food-facts';

export function FoodDrawer({ food, onClose, onSaved, onMutation, onAdd }: {
  food: LibraryFood | null; onClose: () => void; onSaved: (food?: Food, optimisticId?: string) => void;
  onMutation?: (next: Food | undefined, commit: () => Promise<void>) => Promise<boolean>;
  onAdd?: (food: Food, grams: number) => void;
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
  async function remove(restore = false) {
    if (!id || lock.current || !window.confirm(t(restore ? 'confirmRestore' : 'confirmDelete'))) return;
    lock.current = true; setBusy(true); setError('');
    try {
      const commit = async () => {
        const result = restore ? await restoreLibraryFood(id) : await deleteLibraryFood(id);
        if (!result.ok) { setError(result.error); throw new Error(result.error); }
        invalidateFoodResources();
        onSaved();
      };
      if (onMutation) await onMutation(undefined, commit); else await commit();
    } catch { setError(foodT('foodDeleteFailed')); }
    finally { lock.current = false; setBusy(false); }
  }
  if (!food) return <LoadingState variant="detail" />;
  return <ResponsiveDialog modal fallbackId="new-library-food" onDismiss={() => { if (!busy) onClose(); }} aria-labelledby={title}
    className="sheet fixed inset-x-0 bottom-0 top-auto z-50 max-h-[90dvh] w-full overflow-y-auto rounded-t-card p-card text-ink lg:inset-x-auto lg:inset-y-4 lg:end-0 lg:m-0 lg:h-auto lg:max-h-[90dvh] lg:w-[26rem] lg:rounded-none lg:border-s lg:border-line">
    <div className="flex items-center justify-between gap-stack">
      <h2 id={title} className="text-xl font-bold">{food.name}</h2>
      <IconButton type="button" disabled={busy} aria-label={t('close')} onClick={onClose}><X aria-hidden /></IconButton>
    </div>
    {food.replacesId && <p className="text-micro text-muted">{t('modified')}</p>}
    {!food.custom && <p className="my-stack text-muted">{t('readonly')}</p>}
    <div className="mt-card-gap grid gap-card-gap" aria-busy={busy}>
      {error && <p role="alert" className="text-danger">{error}</p>}
      {busy && <p role="status">{t('saving')}</p>}
      {!busy && <Link onClick={onClose} className={buttonClass({ variant: 'secondary', block: false, className: "flex min-h-12 items-center justify-center px-page-x font-bold" })}
        href={id ? `${base}/${id}/edit` : `${base}/new?copyFrom=${food.id}`}>{foodT('editFood')}</Link>}
      {id && food.replacesId && <Button variant="secondary" disabled={busy} onClick={() => void remove(true)}>{t('restore')}</Button>}
      {id && <>
        {uses > 0 && <p className="text-muted">{t('blocked', { count: uses })}</p>}
        <Button variant="secondary" type="button" disabled={busy || uses > 0} className="min-h-12 border border-danger/40 text-danger! disabled:opacity-50" onClick={() => void remove()}>{t('delete')}</Button>
      </>}
      <FoodFacts food={food} onAdd={onAdd} />
    </div>
  </ResponsiveDialog>;
}

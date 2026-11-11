'use client';
import { useTimezone } from '@/core/timezone/client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { formatNumber } from '@/lib/format';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { localDate } from '@/lib/dates';
import { Button, Chip, Stepper, TextField } from '@/ui';
import { submitCheckIn } from '../data/checkins';
import type { CheckIn } from '../data/checkins';
import { poses } from '../gallery';

export function CheckinSheet({ latest, open, onClose, onSent }: {
  latest?: CheckIn; open: boolean; onClose: () => void; onSent: () => void;
}) {
  const t = useT(messages);
  const timezone = useTimezone();
  const locale = useLocale();
  const positions = [t('front'), t('side'), t('back')];
  const dialog = useRef<HTMLDialogElement>(null);
  const [weight, setWeight] = useState(latest?.body_weight_kg ?? 75);
  const [waist, setWaist] = useState<number | null>(latest?.waist_cm ?? null);
  const [bodyFat, setBodyFat] = useState(latest?.body_fat_pct?.toString() ?? '');
  const [notes, setNotes] = useState('');
  const [photos, setPhotos] = useState<({ file: File; preview: string } | null)[]>([null, null, null]);
  const previewUrls = useRef(new Set<string>());
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  useEffect(() => {
    const urls = previewUrls.current;
    return () => urls.forEach((url) => URL.revokeObjectURL(url));
  }, []);
  function changePhoto(index: number, file: File | null) {
    const old = photos[index];
    if (old) { URL.revokeObjectURL(old.preview); previewUrls.current.delete(old.preview); }
    const replacement = file ? { file, preview: URL.createObjectURL(file) } : null;
    if (replacement) previewUrls.current.add(replacement.preview);
    setPhotos((current) => current.map((photo, i) => i === index ? replacement : photo));
  }
  useEffect(() => {
    if (open) dialog.current?.showModal();
    else dialog.current?.close();
  }, [open]);
  useEffect(() => {
    const update = () => { if (!navigator.onLine) setError(t('goOnlineToSendPhotos')); };
    update();
    window.addEventListener('offline', update);
    return () => window.removeEventListener('offline', update);
  }, [t]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setError(''); setProgress(0);
    try {
      const result = await submitCheckIn(await loadSupabaseBrowser(), {
        today: localDate(new Date(), timezone), body_weight_kg: weight, waist_cm: waist, notes,
        photos: photos.flatMap((photo) => photo ? [photo.file] : []),
        body_fat_pct: bodyFat === '' ? null : Number(bodyFat),
        photo_poses: poses.filter((_, index) => photos[index] !== null),
        onProgress: (completed, total) => setProgress(Math.round(completed / total * 100)),
      }, t);
      if (result.error) {
        setError(result.error);
        if (result.error === t('youveAlreadySentThisWeeksCheckin')) onSent();
      } else onSent();
    } catch {
      setError(t('couldntSendTheCheckinTryAgain'));
    } finally { setBusy(false); }
  }
  return <dialog ref={dialog} aria-labelledby="checkin-title" onCancel={(event) => {
    event.preventDefault(); onClose();
  }} className="sheet fixed inset-0 m-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-card border border-line bg-bg p-5 text-ink backdrop:bg-bg/80">
    <form onSubmit={submit} className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 id="checkin-title" className="text-xl font-bold">{t('weeklyCheckin')}</h2>
        <Button variant="ghost" aria-label={t('closeCheckin')} onClick={onClose}><X aria-hidden /></Button>
      </header>
      <fieldset disabled={busy} className="space-y-4">
        <Stepper label={t('weightKg')} value={weight} min={20} step={0.1} onChange={(value) => setWeight(Math.min(400, value))} format={(value) => formatNumber(Number(value.toFixed(1)), locale)} />
        <TextField label={t('bodyFatOptional')} type="number" min={3} max={60} step={0.1} value={bodyFat} onChange={event => setBodyFat(event.target.value)} />
        <div className="flex items-center justify-between gap-2">
          <span>{t('waist')}</span>
          <Chip pressed={waist === null} onClick={() => setWaist(waist === null ? latest?.waist_cm ?? 90 : null)}>{t('none')}</Chip>
        </div>
        {waist !== null && <Stepper label={t('waistCm')} value={waist} min={30} step={0.5} onChange={(value) => setWaist(Math.min(300, value))} format={(value) => formatNumber(Number(value.toFixed(1)), locale)} />}
        <TextField label={t('whatWouldYouLikeToTellYour')} value={notes} maxLength={1000} onChange={(event) => setNotes(event.target.value)} hint={`${formatNumber(notes.length, locale)} / ${formatNumber(1000, locale)}`} />
        <p className="text-sm text-muted">{t('upTo3PhotosPrivateToYou')}</p>
        <div className="grid grid-cols-3 gap-2">
          {positions.map((position, index) => <div key={position} className="glass space-y-2 rounded-control p-2">
            <label className="flex min-h-12 cursor-pointer items-center justify-center rounded-control text-sm has-focus-visible:outline-2 has-focus-visible:outline-lime has-focus-visible:outline-offset-2">
              {position}
              <input aria-label={t('photoPosition', { value0: position })} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file && !file.type.startsWith('image/')) setError(t('chooseAnImage'));
                else if (file) changePhoto(index, file);
                event.target.value = '';
              }} />
            </label>
            {photos[index] && <>
              {/* eslint-disable-next-line @next/next/no-img-element -- In-memory file preview. */}
              <img src={photos[index].preview} alt={t('previewPosition', { value0: position })} loading="lazy" decoding="async" width={480} height={640} className="aspect-[3/4] w-full rounded-control object-cover" />
              <Button variant="ghost" className="w-full" aria-label={t('removePhoto', { value0: position })} onClick={() => changePhoto(index, null)}><X aria-hidden className="size-5" /></Button>
            </>}
          </div>)}
        </div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {busy && <div role="status" className="space-y-2"><p>{t('sending')} {formatNumber(progress, locale)}{t('percent')}</p><progress aria-label={t('uploadProgress')} value={progress} max={100} className="w-full accent-lime" /></div>}
      <Button type="submit" size="lg" disabled={busy} className="w-full">{busy ? t('sending') : t('sendCheckin')}</Button>
    </form>
  </dialog>;
}

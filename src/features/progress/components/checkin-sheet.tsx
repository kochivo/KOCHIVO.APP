'use client';

import { useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { X } from 'lucide-react';
import { supabaseBrowser } from '@/core/supabase/browser';
import { localDate } from '@/lib/dates';
import { Button, Chip, Stepper, TextField } from '@/ui';
import { submitCheckIn } from '../data/checkins';
import type { CheckIn } from '../data/checkins';

const positions = ['قدام', 'جنب', 'ضهر'];

export function CheckinSheet({ latest, open, onClose, onSent }: {
  latest?: CheckIn; open: boolean; onClose: () => void; onSent: () => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [weight, setWeight] = useState(latest?.body_weight_kg ?? 75);
  const [waist, setWaist] = useState<number | null>(latest?.waist_cm ?? null);
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
    const update = () => { if (!navigator.onLine) setError('محتاج نت عشان تبعت الصور'); };
    update();
    window.addEventListener('offline', update);
    return () => window.removeEventListener('offline', update);
  }, []);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (busy) return;
    // photo_paths has no slot labels, so the front photo must always be first for before/after.
    if (!photos[0] && photos.some(Boolean)) { setError('ابدأ بصورة من قدام'); return; }
    setBusy(true); setError(''); setProgress(0);
    try {
      const result = await submitCheckIn(supabaseBrowser(), {
        today: localDate(new Date()), body_weight_kg: weight, waist_cm: waist, notes,
        photos: photos.flatMap((photo) => photo ? [photo.file] : []),
        onProgress: (completed, total) => setProgress(Math.round(completed / total * 100)),
      });
      if (result.error) {
        setError(result.error);
        if (result.error === 'بعتّ تحديث الأسبوع ده خلاص') onSent();
      } else onSent();
    } catch {
      setError('التحديث متبعتش. جرّب تاني');
    } finally { setBusy(false); }
  }
  return <dialog ref={dialog} aria-labelledby="checkin-title" onCancel={(event) => {
    event.preventDefault(); if (!busy) onClose();
  }} className="fixed inset-0 m-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-card border border-line bg-bg p-5 text-ink backdrop:bg-bg/80">
    <form onSubmit={submit} className="space-y-4">
      <header className="flex items-center justify-between">
        <h2 id="checkin-title" className="text-xl font-bold">تحديث الأسبوع</h2>
        <Button variant="ghost" aria-label="اقفل التحديث" disabled={busy} onClick={onClose}><X aria-hidden /></Button>
      </header>
      <fieldset disabled={busy} className="space-y-4">
        <Stepper label="الوزن بالكيلو" value={weight} min={20} step={0.1} onChange={(value) => setWeight(Math.min(400, value))} format={(value) => value.toFixed(1)} />
        <div className="flex items-center justify-between gap-2">
          <span>محيط الوسط</span>
          <Chip pressed={waist === null} onClick={() => setWaist(waist === null ? latest?.waist_cm ?? 90 : null)}>من غير</Chip>
        </div>
        {waist !== null && <Stepper label="الوسط بالسنتي" value={waist} min={30} step={0.5} onChange={(value) => setWaist(Math.min(300, value))} format={(value) => value.toFixed(1)} />}
        <TextField label="عايز تقول إيه للكابتن؟" value={notes} maxLength={1000} onChange={(event) => setNotes(event.target.value)} hint={`${notes.length} / 1000`} />
        <p className="text-sm text-muted">لحد ٣ صور خاصة بيك وبالكابتن</p>
        <div className="grid grid-cols-3 gap-2">
          {positions.map((position, index) => <div key={position} className="glass space-y-2 rounded-control p-2">
            <label className="flex min-h-12 cursor-pointer items-center justify-center text-sm">
              {position}
              <input aria-label={`صورة ${position}`} type="file" accept="image/*" capture="environment" className="sr-only" onChange={(event) => {
                const file = event.target.files?.[0];
                if (file && !file.type.startsWith('image/')) setError('اختار صورة');
                else if (file) changePhoto(index, file);
                event.target.value = '';
              }} />
            </label>
            {photos[index] && <>
              {/* eslint-disable-next-line @next/next/no-img-element -- In-memory file preview. */}
              <img src={photos[index].preview} alt={`معاينة ${position}`} className="aspect-[3/4] w-full rounded-control object-cover" />
              <Button variant="ghost" className="w-full" aria-label={`امسح صورة ${position}`} onClick={() => changePhoto(index, null)}><X aria-hidden className="size-5" /></Button>
            </>}
          </div>)}
        </div>
      </fieldset>
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      {busy && <div role="status" className="space-y-2"><p>جاري الإرسال {progress}٪</p><progress aria-label="تقدم الإرسال" value={progress} max={100} className="w-full accent-lime" /></div>}
      <Button type="submit" size="lg" disabled={busy} className="w-full">{busy ? 'جاري الإرسال' : 'ابعت التحديث'}</Button>
    </form>
  </dialog>;
}

'use client';

import { useEffect, useRef, useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { Button, TextField } from '@/ui';
import { messages } from '../messages';
import { bodyParts, bodyPartLabels, customExerciseSchema } from '../custom-exercises';
import type { CustomExerciseInput } from '../custom-exercises';
import type { LibraryExercise } from '../types';

export function CustomExerciseSheet({ exercise, onClose, onSave }: {
  exercise: LibraryExercise | null; onClose: () => void;
  onSave: (input: CustomExerciseInput) => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const [name, setName] = useState(exercise?.name_ar ?? exercise?.name_en ?? '');
  const [bodyPart, setBodyPart] = useState(exercise?.body_part ?? bodyParts[0]);
  const [equipment, setEquipment] = useState(exercise?.equipment ?? '');
  const [target, setTarget] = useState(exercise?.target ?? '');
  const [videoUrl, setVideoUrl] = useState(exercise?.video_url ?? '');
  const [errors, setErrors] = useState<Record<string, boolean>>({});
  useEffect(() => {
    const element = dialog.current;
    const opener = document.activeElement;
    element?.showModal();
    return () => { element?.close(); if (opener instanceof HTMLElement && opener.isConnected) opener.focus(); };
  }, []);
  return <dialog ref={dialog} dir={locale === 'ar' ? 'rtl' : 'ltr'} aria-labelledby="custom-exercise-title"
    className="sheet m-auto max-h-dvh w-full max-w-md overflow-y-auto rounded-card p-card text-ink backdrop:bg-bg-deep/80"
    onCancel={event => { event.preventDefault(); event.stopPropagation(); onClose(); }}>
    <form noValidate className="space-y-card-gap" onSubmit={event => {
      event.preventDefault();
      const parsed = customExerciseSchema.safeParse({ name, bodyPart, target, videoUrl, equipment: equipment || null });
      if (!parsed.success) {
        setErrors(Object.fromEntries(parsed.error.issues.map(issue => [String(issue.path[0]), true])));
        return;
      }
      onSave(parsed.data);
    }}>
      <h2 id="custom-exercise-title" className="text-xl font-bold">{t(exercise ? 'editCustomExercise' : 'newCustomExercise')}</h2>
      <TextField label={t('customExerciseName')} value={name} onChange={event => setName(event.target.value)} maxLength={60}
        error={errors.name ? t('customNameError') : undefined} autoFocus />
      <label className="flex flex-col gap-inline">{t('bodyPart')}
        <select value={bodyPart} onChange={event => { setBodyPart(event.target.value); setEquipment(''); }} aria-invalid={errors.bodyPart || undefined}
          aria-describedby={errors.bodyPart ? 'custom-body-error' : undefined}
          className="min-h-12 rounded-control border border-line bg-surface px-stack text-ink">
          {bodyParts.map(part => <option key={part} value={part}>{t(bodyPartLabels[part])}</option>)}
        </select>
      </label>
      {errors.bodyPart && <p id="custom-body-error" role="alert" className="text-danger">{t('customBodyError')}</p>}
      {bodyPart === 'cardio' && <label className="flex flex-col gap-inline">{t('machine')}
        <select value={equipment} onChange={event => setEquipment(event.target.value)}
          className="min-h-12 rounded-control border border-line bg-surface px-stack text-ink">
          <option value="">{t('noMachine')}</option>
          {(['treadmill', 'stairmaster'] as const).map(machine => <option key={machine} value={machine}>{t(machine)}</option>)}
        </select>
      </label>}
      <TextField label={t('customTarget')} value={target} onChange={event => setTarget(event.target.value)} maxLength={40}
        error={errors.target ? t('customTargetError') : undefined} />
      <TextField label={t('customVideo')} value={videoUrl} onChange={event => setVideoUrl(event.target.value)} type="url" maxLength={500}
        error={errors.videoUrl ? t('customVideoError') : undefined} />
      <div className="flex gap-stack">
        <Button type="submit">{t('saveCustomExercise')}</Button>
        <Button variant="ghost" onClick={onClose}>{t('cancelCustomExercise')}</Button>
      </div>
    </form>
  </dialog>;
}

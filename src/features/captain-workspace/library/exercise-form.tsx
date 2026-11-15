'use client';

import { clickableClass, Button } from '@/ui/button';
import { editableFieldClass } from '@/ui/edit-in-place';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useRef, useState } from 'react';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { resourceStore } from '@/core/resource/store';

import { RowLink } from '@/ui/row-link';
import { KoSend } from '@/ui/icons/ko-send';
import { Chip } from '@/ui/chip';
import { LoadingState } from '@/ui/loading-state';
import { useToast } from '@/ui/toast';
import type { LibraryExercise } from '@/features/programs';
import { loadExerciseForm, loadLibraryExercise, saveCustom } from '../training/data/editor-actions';
import { ExercisePreview, bodyParts, secondaryOptions, tools } from './exercise-preview';
import type { ExerciseValues } from './exercise-preview';
import { ExerciseDetail } from './exercise-detail';
import { similarExercise } from './similar-exercise';
import type { ExerciseName } from './similar-exercise';
import { messages } from './messages';
import { exerciseReturnPath } from '../training/custom-exercise';
import { searchLibraryExercises } from './data/search';
export { exerciseReturnPath } from '../training/custom-exercise';

export async function refreshSavedExercise(saved: LibraryExercise, exerciseId?: string) {
  await resourceStore.mutate<{ exercise: LibraryExercise | null; names: ExerciseName[] }>(`exercise-form:${exerciseId ?? 'new'}`, current => ({
    exercise: exerciseId ? saved : null,
    names: [...(current?.names ?? []).filter(row => row.id !== saved.id), { id: saved.id, name_ar: saved.name_ar, name_en: saved.name_en }],
  }), async () => {});
  // Returning to the library mounts its default filters, so refresh that snapshot before navigation.
  const filters = { query: '', muscle: 'all', equipment: '', mine: false, page: 0 };
  const key = `exercise-library:${JSON.stringify(filters)}`;
  await resourceStore.retry(key, async () => {
    const result = await searchLibraryExercises({ query: '', bodyPart: '', bodyParts: [], equipment: [], mine: false, page: 0, limit: 30 });
    if (result.error !== undefined) throw new Error(result.error);
    return { data: result.data, total: result.total ?? 0 };
  }, { force: true });
  return resourceStore.read(key).status === 'ready';
}

export function ExerciseForm({ exerciseId, returnTo }: { exerciseId?: string; returnTo?: string }) {
  const t = useT(messages);
  const load = useCallback(async () => {
    const result = await loadExerciseForm(exerciseId);
    if (result.error !== undefined) throw new Error(result.error);
    return result.data;
  }, [exerciseId]);
  const resource = useResource(`exercise-form:${exerciseId ?? 'new'}`, load, { staleMs: 0 });
  if (resource.error) return <div role="alert" className="glass space-y-stack rounded-card p-section">
    <p>{t('error')}</p><Button variant="secondary" onClick={() => void resource.retry()}>{t('retry')}</Button>
  </div>;
  if (!resource.data) return <div role="status"><p>{t('loading')}</p><LoadingState variant="cards" /></div>;
  return <FormFields key={exerciseId ?? 'new'} exercise={resource.data.exercise} names={resource.data.names} returnTo={returnTo} />;
}

function FormFields({ exercise, names, returnTo }: { exercise: LibraryExercise | null; names: ExerciseName[]; returnTo?: string }) {
  const t = useT(messages), toast = useToast(), router = useRouter();
  const [values, setValues] = useState<ExerciseValues>(() => ({ name: exercise?.name_ar ?? '', nameEn: exercise?.name_en ?? '',
    bodyPart: exercise?.body_part ?? 'chest', target: exercise?.target ?? '', equipment: exercise?.equipment ?? '',
    secondaryMuscles: exercise?.secondary_muscles ?? [], instructions: exercise?.instructions_ar ?? [], video: exercise?.video_url ?? '' }));
  const [busy, setBusy] = useState(false), saving = useRef(false);
  const [error, setError] = useState(''), [fields, setFields] = useState<Record<string, string>>({});
  const [detail, setDetail] = useState<LibraryExercise | null>(null), [detailBusy, setDetailBusy] = useState(false);
  const destination = exerciseReturnPath(returnTo);
  const similar = similarExercise(values.name, names, exercise?.id) ?? similarExercise(values.nameEn, names, exercise?.id);
  const patch = (value: Partial<ExerciseValues>) => setValues(current => ({ ...current, ...value }));
  const inputClass = 'mt-inline block min-h-12 w-full rounded-control border border-line bg-transparent px-stack text-ink';
  const fieldError = (key: string) => fields[key] && <p id={`error-${key}`} role="alert" className="text-sm text-danger">{fields[key]}</p>;
  const invalid = (key: string) => ({ 'aria-invalid': Boolean(fields[key]), 'aria-describedby': fields[key] ? `error-${key}` : undefined });
  async function submit() {
    if (saving.current) return;
    saving.current = true; setBusy(true); setError(''); setFields({});
    let navigating = false;
    try {
      const result = await saveCustom(values, exercise?.id);
      if (result.error !== undefined) { setError(result.error); setFields(result.fields ?? {}); return; }
      await refreshSavedExercise(result.data, exercise?.id);
      toast.success(t('saved', { name: result.data.name_ar ?? result.data.name_en }));
      const url = new URL(destination, window.location.origin);
      if (returnTo && destination !== '/captain/library/exercises') {
        url.searchParams.set('customExercise', result.data.id);
        url.searchParams.set('customExerciseMode', exercise ? 'edit' : 'add');
      }
      router.replace(url.pathname + url.search); navigating = true;
    } catch { setError(t('saveError')); }
    finally { if (!navigating) { saving.current = false; setBusy(false); } }
  }
  async function openSimilar() {
    if (!similar || detailBusy) return;
    setDetailBusy(true); setError('');
    try {
      const result = await loadLibraryExercise(similar.id);
      if (result.error !== undefined) setError(result.error); else setDetail(result.data);
    } catch { setError(t('error')); } finally { setDetailBusy(false); }
  }
  return <form noValidate className="space-y-stack" onSubmit={event => { event.preventDefault(); void submit(); }}>
    <header className="glass flex flex-wrap items-center gap-stack rounded-card p-stack">
      <Link aria-label={t('cancel')} aria-disabled={busy} onClick={event => { if (busy) event.preventDefault(); }} href={destination} className={`${clickableClass} press grid min-h-12 min-w-12 cursor-pointer place-items-center rounded-full border border-line bg-surface focus-visible:ring-2 focus-visible:ring-lime`}><KoSend aria-hidden className="size-4 rotate-45 ltr:rotate-225" /></Link>
      <div className="me-auto min-w-0"><h1 className="text-md font-bold">{t(exercise ? 'edit' : 'new')}</h1><p className="mt-inline text-xs text-muted">{t('privacy')}</p></div>
      <Link aria-disabled={busy} onClick={event => { if (busy) event.preventDefault(); }} href={destination} className={`${clickableClass} control control-secondary press hidden min-h-12 items-center px-page-x text-sm min-[761px]:inline-flex`}>{t('cancel')}</Link>
      <Button type="submit" disabled={busy} aria-busy={busy}><KoSend aria-hidden className="size-4" />{t(busy ? 'saving' : 'save')}</Button>
    </header>
    {error && <p role="alert" className="text-danger">{error}</p>}
    <fieldset disabled={busy} className="grid min-w-0 items-start gap-stack min-[761px]:grid-cols-[minmax(0,1fr)_minmax(260px,320px)]">
      <div className="min-w-0 space-y-stack">
        <section className="glass space-y-stack rounded-card border border-line-soft p-card">
          <h2 className="font-bold">{t('nameSection')}</h2>
          <div className="grid gap-card-gap sm:grid-cols-2">
            {(['name', 'nameEn'] as const).map(key => <div key={key}><label className="text-sm text-muted">{t(key)}{key === 'nameEn' && <span className="ms-inline">{t('optional')}</span>}
              <input {...invalid(key)} dir={key === 'nameEn' ? 'ltr' : undefined} required={key === 'name'} maxLength={key === 'name' ? 60 : 120} value={values[key]} onChange={event => patch({ [key]: event.target.value })} className={`${editableFieldClass} ${inputClass}`} />
            </label>{fieldError(key)}</div>)}
          </div>
          {(values.name.trim() || values.nameEn.trim()) && (similar ? <RowLink id="similar-exercise" href="#similar-exercise" aria-busy={detailBusy} onClick={event => { event.preventDefault(); void openSimilar(); }} className="text-sm">{t('similar', { name: similar.name_ar || similar.name_en })}</RowLink> :
            <p role="status" className="text-sm text-muted">{t('noSimilar')}</p>)}
          {detailBusy && <p role="status" className="text-sm text-muted">{t('loading')}</p>}
        </section>
        <section className="glass space-y-stack rounded-card border border-line-soft p-card">
          <div className="flex flex-wrap items-center justify-between gap-inline"><h2 className="font-bold">{t('primary')}</h2><span className="text-xs text-muted">{t('chooseOne')}</span></div>
          <div role="group" aria-label={t('primary')} {...invalid('bodyPart')} className="flex flex-wrap gap-inline">
            {bodyParts.map(([value, label]) => <Chip key={value} pressed={values.bodyPart === value} onClick={() => patch({ bodyPart: value,
              equipment: value !== 'cardio' && ['treadmill', 'stairmaster'].includes(values.equipment) ? '' : values.equipment })}>{t(label)}</Chip>)}
          </div>{fieldError('bodyPart')}
          <label className="block text-sm text-muted">{t('targetMuscle')}<input {...invalid('target')} maxLength={40} value={values.target} onChange={event => patch({ target: event.target.value })} className={`${editableFieldClass} ${inputClass}`} /></label>{fieldError('target')}
        </section>
        <section className="glass space-y-stack rounded-card border border-line-soft p-card">
          <h2 className="font-bold">{t('secondaryMuscles')}</h2><p className="text-sm text-muted">{t('secondaryHint')}</p>
          <div role="group" aria-label={t('secondaryMuscles')} {...invalid('secondaryMuscles')} className="flex flex-wrap gap-inline">
            {[...secondaryOptions, ...values.secondaryMuscles.filter(value => !secondaryOptions.some(([key]) => key === value)).map(value => [value, null] as const)].map(([value, label]) => <Chip key={value} pressed={values.secondaryMuscles.includes(value)}
              disabled={!values.secondaryMuscles.includes(value) && values.secondaryMuscles.length >= 6}
              onClick={() => patch({ secondaryMuscles: values.secondaryMuscles.includes(value) ? values.secondaryMuscles.filter(item => item !== value) : [...values.secondaryMuscles, value] })}>{label ? t(label) : value}</Chip>)}
          </div>{fieldError('secondaryMuscles')}
        </section>
        <section className="glass space-y-stack rounded-card border border-line-soft p-card">
          <h2 className="font-bold">{t('tool')}</h2>
          <div role="group" aria-label={t('tool')} {...invalid('equipment')} className="flex flex-wrap gap-inline">
            {tools.filter(([value]) => values.bodyPart === 'cardio' || !['treadmill', 'stairmaster'].includes(value)).map(([value, label]) => <Chip key={value} pressed={values.equipment === value} onClick={() => patch({ equipment: value })}>{t(label)}</Chip>)}
          </div>{fieldError('equipment')}
        </section>
        <section className="glass space-y-stack rounded-card border border-line-soft p-card">
          <h2 className="font-bold">{t('steps')}</h2><p className="text-sm text-muted">{t('stepsHint')}</p>
          {values.instructions.length ? <ol className="list-decimal space-y-stack ps-card">{values.instructions.map((step, index) => <li key={index}>
            <div className="flex items-start gap-inline"><textarea {...invalid('instructions')} aria-label={t('step', { number: index + 1 })} maxLength={160} value={step} rows={2} className={`${editableFieldClass} ${inputClass} py-stack`}
              onChange={event => patch({ instructions: values.instructions.map((item, position) => position === index ? event.target.value : item) })} />
              <button type="button" aria-label={t('removeStep', { number: index + 1 })} className={`${clickableClass} press min-h-12 shrink-0 cursor-pointer rounded-control border border-line bg-surface px-stack text-sm text-muted focus-visible:ring-2 focus-visible:ring-lime`} onClick={() => patch({ instructions: values.instructions.filter((_, position) => position !== index) })}>{t('remove')}</button></div>
          </li>)}</ol> : <p className="text-sm text-muted">{t('noSteps')}</p>}
          {fieldError('instructions')}<Button type="button" variant="secondary" disabled={values.instructions.length >= 8} onClick={() => patch({ instructions: [...values.instructions, ''] })}>{t('addStep')}</Button>
        </section>
      </div>
      <div className="min-w-0 space-y-stack min-[761px]:sticky min-[761px]:top-3">
        <section className="glass space-y-stack rounded-card border border-line-soft p-card">
          <div className="flex flex-wrap items-center justify-between gap-inline"><h2 className="font-bold">{t('videoSection')}</h2><span className="text-xs text-muted">{t('videoUploadLater')}</span></div>
          <label className="block text-sm text-muted">{t('videoLink')}<input {...invalid('video')} type="url" dir="ltr" maxLength={500} value={values.video} onChange={event => patch({ video: event.target.value })} className={`${editableFieldClass} ${inputClass}`} /></label>
          <p className="text-sm text-muted">{t('videoHint')}</p>{fieldError('video')}
        </section>
        <ExercisePreview values={values} />
      </div>
    </fieldset>
    {detail && <ExerciseDetail exercise={detail} onClose={() => setDetail(null)} />}
  </form>;
}

'use client';
import type { ReactNode } from 'react';
import { KoCamera } from '@/ui/icons/ko-camera';
import { useEffect,useRef,useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/core/i18n/locale';
import type { RequestData } from '../request-types';
import type { AnswerDraft } from '../answers';
import { validAnswer } from '../answers';
import { clearAnswerDraft,readAnswerDraft,writeAnswerDraft } from '../data/answer-draft';
import { submitAnswers } from '../data/submit-answers';
import { submitDraft } from '../data/submit-draft';
import { AnswerPhotoFitError, uploadAnswerPhotos } from '../data/answer-photos';
import { messages } from '../requests/messages';
import { QuestionField } from './question-field';
import type { QuestionValue } from './question-field';
import { useArabicStyle, useT } from '@/core/i18n/client';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { messages as v6Messages } from '../v6-messages';
import { Camera, ChevronLeft } from 'lucide-react';
import { secondaryButtonClass } from '@/ui/secondary-button-class';
import { Button } from '@/ui/button';
import { ProgressBar } from '@/ui/progress-bar';
import css from './answer-flow.module.css';

export function AnswerFlow({data,locale}:{data:RequestData;locale:Locale}) {
  const CameraIcon = captainWorkspaceEnabled() ? KoCamera : Camera;
  const v6 = captainWorkspaceEnabled();
  const v6t = useT(v6Messages);
  const style = useArabicStyle();
  const t = useT(messages), key = `${data.request.player_id}:${data.request.id}`;
  const [draft,setDraft] = useState<AnswerDraft>(() => {
    const saved:AnswerDraft = {};
    for (const a of data.answers) {
      const value = a.value;
      if (value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number'
        || Array.isArray(value) && value.every(v => typeof v === 'string')) saved[a.question_id] = {value,photo_paths:a.photo_paths};
    }
    return {...saved,...readAnswerDraft(key)};
  });
  const [step,setStep] = useState(0), [state,setState] = useState<'editing'|'sending'|'done'>(data.request.answered_at ? 'done' : 'editing');
  const [error,setError] = useState(''), [uploading,setUploading] = useState(false);
  const busy = useRef(false);
  const q = data.questions[step];
  const promptRef = useRef<HTMLElement | null>(null);
  const moved = useRef(false);
  useEffect(() => { if (moved.current) promptRef.current?.focus(); }, [step]);
  const focusPrompt = (node: HTMLElement | null) => { promptRef.current = node; };
  function move(next: number) { moved.current = true; setStep(next); }
  const [groupError, setGroupError] = useState(false);
  function showRequired(question: typeof q) {
    const multi = question?.type === 'multi' && question.required;
    setGroupError(multi);
    setError(t(multi ? 'selectAtLeastOne' : 'required'));
  }
  function update(value:QuestionValue,paths?:string[]) {
    if (!q) return;
    setDraft(current => {
      const next = {...current,[q.id]:{value,photo_paths:paths ?? current[q.id]?.photo_paths ?? []}};
      writeAnswerDraft(key,next); return next;
    });
    setError(''); setGroupError(false);
  }
  async function photos(files:FileList|null) {
    if (!files?.length || busy.current) return;
    busy.current = true; setUploading(true); setError('');
    try { update(null,await uploadAnswerPhotos(data.request.player_id,data.request.id,files)); }
    catch (error) { setError(t(error instanceof AnswerPhotoFitError ? 'photoFitError' : 'photosError')); }
    finally { busy.current = false; setUploading(false); }
  }
  async function advance() {
    if (!q || busy.current) return;
    if (!validAnswer(q,draft[q.id]?.value ?? null,draft[q.id]?.photo_paths)) {showRequired(q);return;}
    if (step < data.questions.length-1) {move(step+1);setError('');setGroupError(false);return;}
    const invalid = data.questions.findIndex(q => !validAnswer(q,draft[q.id]?.value ?? null,draft[q.id]?.photo_paths));
    if (invalid >= 0) {move(invalid);showRequired(data.questions[invalid]);return;}
    if (!navigator.onLine) {setError(t('offline'));return;}
    busy.current = true;setState('sending');setError('');
    try {
      const ok = await submitDraft(() => submitAnswers({requestId:data.request.id,draft}),() => clearAnswerDraft(key));
      if (!ok) throw new Error('submit');
      setState('done');
    } catch {setError(t('error'));setState('editing');}
    finally {busy.current = false;}
  }
  if (state === 'done') return <section className="glass-strong space-y-card-gap rounded-card p-section" role="status">
    <h1 className="text-2xl font-bold">{t('done')}</h1>
    {data.request.captain_reply?.trim() && <div className="recessed rounded-card p-card text-sm">
      {data.request.reviewed_at && <p className="text-xs text-muted">{t('reviewed')}</p>}
      <p className="whitespace-pre-wrap break-words text-ink">{data.request.captain_reply}</p>
    </div>}
    <Link href={`/${locale}/player`} className="flex min-h-12 items-center text-lime">{t('home')}</Link></section>;
  if (data.request.reviewed_at) return <p>{t('reviewed')}</p>;
  if (!q) return <p>{t('unavailable')}</p>;
  const progress = v6t('progress', { n: step + 1, total: data.questions.length });
  return <section className={v6 ? `${css.flow} flex flex-col gap-card-gap` : 'glass-strong space-y-card-gap rounded-card p-section'} aria-busy={state === 'sending' || uploading}>
    {v6 ? <header className="flex items-center gap-stack">
      <Link href={`/${locale}/player`} aria-label={v6t('close')} className={`${secondaryButtonClass} size-12 shrink-0 !p-0`}><ChevronLeft aria-hidden className="dir-icon size-5" /></Link>
      <div className="min-w-0 flex-1 space-y-inline">
        <h1 className="text-md font-bold">{data.title}</h1>
        <ProgressBar thin value={step + 1} max={data.questions.length} aria-label={data.title} aria-valuetext={progress} />
      </div>
      <p className="shrink-0 text-xs text-muted">{progress}</p>
    </header> : <h1 className="text-2xl font-bold">{data.title}</h1>}
    {!v6 && /* iOS paints native <progress> in system green and ignores accent-color. */
      <div role="progressbar" aria-label={data.title} aria-valuemin={1} aria-valuemax={data.questions.length} aria-valuenow={step+1}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-raised">
        <div className="h-full rounded-full bg-lime transition-[width]" style={{ width: `${((step+1)/data.questions.length)*100}%` }} />
      </div>}
    <form className={v6 ? 'flex flex-1 flex-col' : undefined} onSubmit={e => {e.preventDefault();void advance();}}>
      <fieldset className={v6 ? 'flex min-w-0 flex-1 flex-col gap-stack' : undefined} disabled={state === 'sending' || uploading}>
        {v6 && <p className="pt-card text-xs text-muted">{v6t('question', { n: step + 1 })}</p>}
        <Wrap v6={v6}>
        {v6 && q.type === 'photos' ? <div className="space-y-card-gap">
          <h2 ref={focusPrompt} tabIndex={-1} className="font-display text-h font-semibold">{locale === 'en' ? q.label_en.trim() || q.label_ar : q.label_ar}</h2>
          <div className="recessed flex aspect-[3/2] min-h-fit flex-wrap content-center items-center justify-center gap-stack rounded-control p-card text-muted">
            <div className="flex w-full flex-col items-center gap-inline text-center"><CameraIcon aria-hidden className="size-8" /><p className="text-sm">{v6t('photo')}</p></div>
            <label className="glass flex min-h-12 cursor-pointer items-center rounded-full border border-line-soft px-page-x">{v6t('camera')}
              <input type="file" accept="image/*" capture="user" className="sr-only" aria-label={v6t('camera')} onChange={event => void photos(event.target.files)} /></label>
            <label className="glass flex min-h-12 cursor-pointer items-center rounded-full border border-line-soft px-page-x">{v6t('gallery')}
              <input type="file" accept="image/*" multiple className="sr-only" aria-label={v6t('gallery')} onChange={event => void photos(event.target.files)} /></label>
          </div>
        </div> : <QuestionField key={q.id} question={{...q,required:q.type === 'photos' && draft[q.id]?.photo_paths.length ? false : q.required}}
          promptRef={focusPrompt} groupError={groupError ? error : undefined} locale={locale} style={style} value={draft[q.id]?.value ?? null} onChange={value => update(value)} onPhotos={files => void photos(files)} playerCard={v6} />}
        {q.type === 'photos' && !!draft[q.id]?.photo_paths.length && <p className="text-sm text-muted">{t('savedPhotos')}</p>}
        {uploading && <p role="status">{t('upload')}</p>}
        {error && !groupError && <p role="alert" className="py-stack text-danger">{error}</p>}
        </Wrap>
        <div className={v6 ? 'mt-auto flex gap-stack pt-card' : 'mt-card-gap flex gap-stack'}>
          {(step>0 || v6) && <Button type="button" onClick={() => {if (step > 0) move(step-1);setError('');setGroupError(false);}} disabled={v6 && step === 0}
            variant="secondary" block={false} className="min-h-12 px-page-x">{v6 ? v6t('back') : t('previous')}</Button>}
          <Button type="submit" variant="primary" size={v6 ? 'lg' : 'md'} block={false} className={v6 ? "flex-1 px-page-x" : "min-h-12 flex-1 px-page-x font-bold"}>
            {state === 'sending' ? t('submitting') : error ? t('retry') : step === data.questions.length-1 ? t('finish') : t('next')}</Button>
        </div>
      </fieldset>
    </form>
    {v6 && <p className="text-center text-micro text-faint">{v6t('offline')}</p>}
  </section>;
}

function Wrap({ v6, children }: { v6: boolean; children: ReactNode }) {
  return v6 ? <div className="min-w-0 [&_label:has(:focus-visible)]:outline-2 [&_label:has(:focus-visible)]:outline-lime">{children}</div> : <>{children}</>;
}

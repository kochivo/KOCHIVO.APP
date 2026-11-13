'use client';
import { KoCamera } from '@/ui/icons/ko-camera';
import { useRef,useState } from 'react';
import Link from 'next/link';
import type { Locale } from '@/core/i18n/locale';
import type { RequestData } from '../request-types';
import type { AnswerDraft } from '../answers';
import { validAnswer } from '../answers';
import { clearAnswerDraft,readAnswerDraft,writeAnswerDraft } from '../data/answer-draft';
import { submitAnswers } from '../data/submit-answers';
import { submitDraft } from '../data/submit-draft';
import { uploadAnswerPhotos } from '../data/answer-photos';
import { messages } from '../requests/messages';
import { QuestionField } from './question-field';
import type { QuestionValue } from './question-field';
import { useArabicStyle, useT } from '@/core/i18n/client';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { messages as v6Messages } from '../v6-messages';
import { Camera, X } from 'lucide-react';

export function AnswerFlow({data,locale}:{data:RequestData;locale:Locale}) {
  const CameraIcon = captainWorkspaceEnabled() ? KoCamera : Camera;
  const v6 = captainWorkspaceEnabled();
  const v6t = useT(v6Messages);
  const style = useArabicStyle();
  const m = messages[locale], key = `${data.request.player_id}:${data.request.id}`;
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
  function update(value:QuestionValue,paths?:string[]) {
    if (!q) return;
    setDraft(current => {
      const next = {...current,[q.id]:{value,photo_paths:paths ?? current[q.id]?.photo_paths ?? []}};
      writeAnswerDraft(key,next); return next;
    });
    setError('');
  }
  async function photos(files:FileList|null) {
    if (!files?.length || busy.current) return;
    busy.current = true; setUploading(true); setError('');
    try { update(null,await uploadAnswerPhotos(data.request.player_id,data.request.id,files)); }
    catch { setError(m.photosError); }
    finally { busy.current = false; setUploading(false); }
  }
  async function advance() {
    if (!q || busy.current) return;
    if (!validAnswer(q,draft[q.id]?.value ?? null,draft[q.id]?.photo_paths)) {setError(m.required);return;}
    if (step < data.questions.length-1) {setStep(step+1);setError('');return;}
    const invalid = data.questions.findIndex(q => !validAnswer(q,draft[q.id]?.value ?? null,draft[q.id]?.photo_paths));
    if (invalid >= 0) {setStep(invalid);setError(m.required);return;}
    if (!navigator.onLine) {setError(m.offline);return;}
    busy.current = true;setState('sending');setError('');
    try {
      const ok = await submitDraft(() => submitAnswers({requestId:data.request.id,draft}),() => clearAnswerDraft(key));
      if (!ok) throw new Error('submit');
      setState('done');
    } catch {setError(m.error);setState('editing');}
    finally {busy.current = false;}
  }
  if (state === 'done') return <section className="glass-strong space-y-5 rounded-card p-6" role="status">
    <h1 className="text-2xl font-bold">{m.done}</h1><Link href={`/${locale}/player`} className="flex min-h-12 items-center text-lime">{m.home}</Link></section>;
  if (data.request.reviewed_at) return <p>{m.reviewed}</p>;
  if (!q) return <p>{m.unavailable}</p>;
  return <section className={v6 ? 'space-y-5' : 'glass-strong space-y-5 rounded-card p-6'} aria-busy={state === 'sending' || uploading}>
    {v6 ? <header className="flex items-center gap-2 text-xs text-faint">
      <Link href={`/${locale}/player`} aria-label={v6t('close')} className="grid min-h-12 min-w-12 place-items-center"><X aria-hidden className="size-5" /></Link>
      <h1 className="min-w-0 flex-1">{data.title}</h1><span>{v6t('progress', { n: step + 1, total: data.questions.length })}</span>
    </header> : <h1 className="text-2xl font-bold">{data.title}</h1>}
    <progress className="w-full accent-lime" value={step+1} max={data.questions.length} aria-label={data.title} />
    <form onSubmit={e => {e.preventDefault();void advance();}}>
      <fieldset disabled={state === 'sending' || uploading}>
        {v6 && q.type === 'photos' ? <div className="space-y-4">
          <h2 className="font-display text-[22px] font-semibold">{locale === 'en' ? q.label_en.trim() || q.label_ar : q.label_ar}</h2>
          <div className="glass flex aspect-[3/4] flex-col items-center justify-center gap-4 rounded-card border border-line-soft p-5 text-muted">
            <CameraIcon aria-hidden className="size-8" /><p className="text-sm">{v6t('photo')}</p>
            <label className="glass flex min-h-12 cursor-pointer items-center rounded-full border border-line-soft px-5">{v6t('camera')}
              <input type="file" accept="image/*" capture="user" className="sr-only" aria-label={v6t('camera')} onChange={event => void photos(event.target.files)} /></label>
            <label className="glass flex min-h-12 cursor-pointer items-center rounded-full border border-line-soft px-5">{v6t('gallery')}
              <input type="file" accept="image/*" multiple className="sr-only" aria-label={v6t('gallery')} onChange={event => void photos(event.target.files)} /></label>
          </div>
        </div> : <QuestionField key={q.id} question={{...q,required:q.type === 'photos' && draft[q.id]?.photo_paths.length ? false : q.required}}
          locale={locale} style={style} value={draft[q.id]?.value ?? null} onChange={value => update(value)} onPhotos={files => void photos(files)} />}
        {q.type === 'photos' && !!draft[q.id]?.photo_paths.length && <p className="text-sm text-muted">{m.savedPhotos}</p>}
        {uploading && <p role="status">{m.upload}</p>}
        {error && <p role="alert" className="py-3 text-danger">{error}</p>}
        <div className="mt-5 flex gap-3">
          {(step>0 || v6) && <button type="button" onClick={() => {if (step > 0) setStep(step-1);setError('');}} disabled={v6 && step === 0}
            className={v6 ? 'min-h-12 flex-1 rounded-full border border-line-soft px-5 disabled:opacity-40' : 'min-h-12 px-5'}>{v6 ? v6t('back') : m.previous}</button>}
          <button type="submit" className={v6 ? 'min-h-12 flex-[2] rounded-full bg-lime px-5 font-semibold text-on-lime' : 'min-h-12 flex-1 rounded-control bg-lime px-5 font-bold text-on-lime'}>
            {state === 'sending' ? m.submitting : error ? m.retry : step === data.questions.length-1 ? m.finish : m.next}</button>
        </div>
      </fieldset>
    </form>
    {v6 && <p className="text-center text-[11.5px] text-faint">{v6t('offline')}</p>}
  </section>;
}

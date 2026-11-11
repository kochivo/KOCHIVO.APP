'use client';
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

export function AnswerFlow({data,locale}:{data:RequestData;locale:Locale}) {
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
  return <section className="glass-strong space-y-5 rounded-card p-6" aria-busy={state === 'sending' || uploading}>
    <h1 className="text-2xl font-bold">{data.title}</h1>
    <progress className="w-full accent-lime" value={step+1} max={data.questions.length} aria-label={data.title} />
    <form onSubmit={e => {e.preventDefault();void advance();}}>
      <fieldset disabled={state === 'sending' || uploading}>
        <QuestionField key={q.id} question={{...q,required:q.type === 'photos' && draft[q.id]?.photo_paths.length ? false : q.required}}
          locale={locale} value={draft[q.id]?.value ?? null} onChange={value => update(value)} onPhotos={files => void photos(files)} />
        {q.type === 'photos' && !!draft[q.id]?.photo_paths.length && <p className="text-sm text-muted">{m.savedPhotos}</p>}
        {uploading && <p role="status">{m.upload}</p>}
        {error && <p role="alert" className="py-3 text-danger">{error}</p>}
        <div className="mt-5 flex gap-3">
          {step>0 && <button type="button" onClick={() => {setStep(step-1);setError('');}} className="min-h-12 px-5">{m.previous}</button>}
          <button type="submit" className="min-h-12 flex-1 rounded-control bg-lime px-5 font-bold text-on-lime">
            {state === 'sending' ? m.submitting : error ? m.retry : step === data.questions.length-1 ? m.finish : m.next}</button>
        </div>
      </fieldset>
    </form>
  </section>;
}

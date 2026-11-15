'use client';
import { Button } from '@/ui/button';
import { useRef,useState } from 'react';
import type { Locale } from '@/core/i18n/locale';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import type { RequestData } from '../request-types';
import { messages } from '../requests/messages';
import { reviewRequest } from '../data/request-actions';
import { QuestionField } from './question-field';
import type { QuestionValue } from './question-field';
import { buttonClass } from '@/ui/button';
export function RequestReview({data,locale,onReviewed}:{data:RequestData;locale:Locale;onReviewed:()=>void}) {
  const m = messages[locale];
  const [reply,setReply] = useState(data.request.captain_reply ?? ''),[pending,setPending] = useState(false),[error,setError] = useState(false);
  const [photos,setPhotos] = useState<Record<string,string>>({});
  const busy = useRef(false);
  async function review() {
    if (busy.current) return;
    busy.current = true;setPending(true);setError(false);
    try {if (!(await reviewRequest(data.request.id,reply)).ok) throw new Error('review');onReviewed();}
    catch {setError(true);}
    finally {busy.current = false;setPending(false);}
  }
  async function sign(path:string) {
    try {
      const client = await loadSupabaseBrowser();
      const result = await client.storage.from('checkin-photos').createSignedUrl(path,300);
      if (result.error) throw result.error;
      setPhotos(current => ({...current,[path]:result.data.signedUrl}));
    } catch {setError(true);}
  }
  return <article className="glass-strong space-y-card-gap rounded-card p-card">
    <h2 className="text-xl font-bold">{data.title}</h2>
    {!data.request.answered_at ? <p>{m.pendingAnswer}</p> : <>
      {!data.answers.length && <p>{m.noAnswers}</p>}
      {data.questions.map(q => {
        const a = data.answers.find(a => a.question_id === q.id);
        const value = a?.value;
        const safe:QuestionValue = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
          || Array.isArray(value) && value.every(v => typeof v === 'string') ? value : null;
        return <div key={q.id}><QuestionField question={q} locale={locale} value={safe} readOnly />
          {a?.photo_paths.map(path => <div key={path}>{photos[path]
            ? <a href={photos[path]} target="_blank" rel="noreferrer" className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center px-page-x" })}>{m.photo}</a>
            : <Button variant="secondary" type="button" className="min-h-12" onClick={() => void sign(path)}>{m.photo}</Button>}</div>)}</div>;
      })}
      {data.request.reviewed_at ? <p>{m.reviewed} · {data.request.captain_reply}</p> :
        <form onSubmit={e => {e.preventDefault();void review();}} className="space-y-stack">
          <label className="block">{m.reply}<textarea maxLength={1000} value={reply} onChange={e => setReply(e.target.value)}
            className="mt-inline min-h-24 w-full rounded-control bg-surface p-stack" disabled={pending} /></label>
          <button disabled={pending} className="min-h-12 rounded-control bg-lime-soft px-page-x font-bold text-lime">{pending ? m.sending : m.review}</button>
        </form>}
    </>}
    {error && <p role="alert" className="text-danger">{m.error}</p>}
  </article>;
}

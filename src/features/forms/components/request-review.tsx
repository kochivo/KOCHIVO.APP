'use client';
import { useT } from '@/core/i18n/client';
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
  const t = useT(messages);
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
  return <article className="glass space-y-card-gap rounded-card p-card">
    <h2 className="text-xl font-bold">{data.title}</h2>
    {!data.request.answered_at ? <p>{t('pendingAnswer')}</p> : <>
      {!data.answers.length && <p>{t('noAnswers')}</p>}
      {data.questions.map(q => {
        const a = data.answers.find(a => a.question_id === q.id);
        const value = a?.value;
        const safe:QuestionValue = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
          || Array.isArray(value) && value.every(v => typeof v === 'string') ? value : null;
        return <div key={q.id} className="glass space-y-stack rounded-control p-stack"><QuestionField question={q} locale={locale} value={safe} readOnly />
          {Boolean(a?.photo_paths.length) && <div className="grid gap-inline min-[760px]:grid-cols-2 xl:grid-cols-3">{a?.photo_paths.map(path => <div key={path}>{photos[path]
            ? <a href={photos[path]} target="_blank" rel="noreferrer" className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center px-page-x" })}>{t('photo')}</a>
            : <Button variant="secondary" type="button" className="min-h-12" onClick={() => void sign(path)}>{t('photo')}</Button>}</div>)}</div>}</div>;
      })}
      {data.request.reviewed_at ? <p>{t('reviewed')} · {data.request.captain_reply}</p> :
        <form onSubmit={e => {e.preventDefault();void review();}} className="space-y-stack">
          <label className="block">{t('reply')}<textarea maxLength={1000} value={reply} onChange={e => setReply(e.target.value)}
            className="mt-inline min-h-24 w-full rounded-control bg-surface p-stack" disabled={pending} /></label>
          <Button type="submit" disabled={pending}>{pending ? t('sending') : t('review')}</Button>
        </form>}
    </>}
    {error && <p role="alert" className="text-danger">{t('error')}</p>}
  </article>;
}

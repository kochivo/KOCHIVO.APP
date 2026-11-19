import { useCallback, useEffect, useRef, useState } from 'react';
import { ThumbsDown, ThumbsUp } from 'lucide-react';
import { Button } from '@/ui/button';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { koLearning } from '../data/learning';
import type { Feedback, FeedbackReason } from '../data/learning';

const reasons = ['misunderstood', 'wrong', 'long'] as const;

export function KoFeedback({ id, question, answer, intent, sources, closeSignal, initialRating, onRate }:
  Omit<Feedback, 'helpful' | 'reason'> & { closeSignal: number; initialRating?: boolean; onRate?: (rating: boolean) => void }) {
  const t = useT(messages);
  const [rating, setRating] = useState(initialRating);
  const [open, setOpen] = useState(false);
  const [failed, setFailed] = useState(false);
  const panel = useRef<HTMLDivElement>(null);
  const pending = useRef(false);
  const sent = useRef(initialRating !== undefined);
  const submit = useCallback((helpful: boolean, reason?: FeedbackReason) => {
    if (sent.current) return;
    pending.current = false;
    sent.current = true;
    setOpen(false);
    setRating(helpful);
    setFailed(false);
    void koLearning({ operation: 'feedback', feedback: { id, question, answer, intent, sources, helpful, reason } })
      .then(() => onRate?.(helpful))
      .catch(() => { sent.current = false; setRating(undefined); setFailed(true); });
  }, [answer, id, intent, onRate, question, sources]);
  const submitRef = useRef(submit);
  useEffect(() => { submitRef.current = submit; }, [submit]);
  useEffect(() => () => { if (pending.current) submitRef.current(false); }, []);
  useEffect(() => { if (pending.current) submitRef.current(false); }, [closeSignal]);
  useEffect(() => {
    if (!open) return;
    function outside(event: PointerEvent) {
      if (event.target instanceof Node && !panel.current?.contains(event.target)) submit(false);
    }
    document.addEventListener('pointerdown', outside);
    return () => document.removeEventListener('pointerdown', outside);
  }, [open, submit]);
  const style = (value: boolean) => `grid size-12 place-items-center rounded-control px-0! disabled:opacity-100 ${rating === value || (!value && open) ? 'bg-surface-raised text-ink' : 'text-muted'}`;
  return <div ref={panel} onBlur={event => {
    if (open && event.relatedTarget && !event.currentTarget.contains(event.relatedTarget)) submit(false);
  }} onKeyDown={event => {
    if (open && event.key === 'Escape') { event.stopPropagation(); event.preventDefault(); submit(false); }
  }}>
    <div className="flex gap-inline">
      <Button type="button" variant="ghost" aria-label={t('feedbackUp')} aria-pressed={rating === true} disabled={rating !== undefined || open}
        className={style(true)} onClick={() => submit(true)}><ThumbsUp aria-hidden className="size-5" /></Button>
      <Button type="button" variant="ghost" aria-label={t('feedbackDown')} aria-pressed={rating === false || open} aria-expanded={open}
        disabled={rating !== undefined} className={style(false)}
        onClick={() => { if (open) submit(false); else { pending.current = true; setOpen(true); } }}><ThumbsDown aria-hidden className="size-5" /></Button>
    </div>
    {open && <div className="space-y-inline rounded-2xl border border-line p-stack">
      <p className="text-sm">{t('feedbackWhy')}</p>
      <div className="flex flex-wrap gap-inline">
        {reasons.map(reason => <Button key={reason} type="button" variant="ghost" className="rounded-full border border-line px-stack text-sm"
          onClick={() => submit(false, reason)}>{t(`feedback.${reason}`)}</Button>)}
      </div>
    </div>}
    {failed && <p className="text-xs text-danger" role="alert">{t('feedbackError')}</p>}
  </div>;
}

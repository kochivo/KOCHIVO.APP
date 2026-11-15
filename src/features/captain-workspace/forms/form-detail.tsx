'use client';
import { useTimezone } from '@/core/timezone/client';

import { useRef, useState } from 'react';
import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { useToast } from '@/ui/toast';
import type { PlayerForm } from './adapter';
import type { FormsMutation, ReviewAction } from './review';
import { sendFormReview } from './review';
import { FormAnswers } from './form-answers';
import { FormPhotos } from './form-photos';
import type { SignPhotos } from './form-photos';
import { formDate } from './format';
import { messages } from './messages';
import { Button } from '@/ui/button';
import { useT } from '@/core/i18n/client';
import { messages as successMessages } from '../success/messages';

export function FormDetail({ form, playerId, locale, mutate, review, sign }: {
  form: PlayerForm; playerId: string; locale: Locale; mutate: FormsMutation; review: ReviewAction; sign: SignPhotos;
}) {
  const t = createT(messages, locale);
  const timezone = useTimezone();
  const toast = useToast();
  const success = useT(successMessages);
  const [reply, setReply] = useState(form.reply ?? '');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState(false);
  const locked = useRef(false);
  const checkin = form.snapshot.source.kind === 'checkin';
  async function send() {
    if (locked.current) return;
    locked.current = true;
    setSending(true);
    setSendError(false);
    try {
      const ok = await sendFormReview({ form, reply, now: new Date(), mutate, review, toast: { error: toast.error, success: title => toast.success({ title, detail: success('form', { name: t(checkin ? 'checkin' : 'intake') }), icon: 'form' }) },
        failure: t('sendFailed'), success: success('replySent') });
      setSendError(!ok);
    } finally { locked.current = false; setSending(false); }
  }
  return <article id="player-form-detail" tabIndex={-1} className="glass-strong min-w-0 rounded-card p-6">
    <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div><h2 className="text-xl font-bold">{t(checkin ? 'checkin' : 'intake')}</h2>
        <p className="mt-1 text-sm text-muted">{formDate(form.snapshot.source.at, locale, timezone)}</p></div>
      <span className="text-sm text-muted">{t(form.reviewedAt ? 'reviewed' : 'new')}</span>
      {form.previous && <p className="w-full text-sm text-muted">{t('compare', { date: formDate(form.previous.source.at, locale, timezone) })}</p>}
    </header>
    <FormAnswers form={form} locale={locale} trainingHref={`/captain/players/${playerId}/programs`} />
    {checkin && <>
      <FormPhotos key={form.snapshot.source.id} id={form.snapshot.source.id} playerId={playerId} count={form.photoCount} locale={locale} sign={sign} />
      <form className="mt-4 space-y-3" onSubmit={event => { event.preventDefault(); void send(); }}>
        <label className="block space-y-2"><span className="text-sm text-muted">{t('reply')}</span>
          <textarea value={reply} onChange={event => setReply(event.target.value)} maxLength={1000} disabled={sending}
            className="min-h-24 w-full rounded-control border border-line bg-bg p-3 text-start" />
        </label>
        {sendError && <p role="alert" className="text-sm text-danger">{t('sendFailed')}</p>}
        <Button type="submit" disabled={sending} variant={'primary'} block={false} className={"min-h-12 w-full px-6 font-bold disabled:opacity-50"}>{t(sending ? 'sending' : 'send')}</Button>
      </form>
    </>}
  </article>;
}

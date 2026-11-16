'use client';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { useRef,useState } from 'react';
import type { Locale } from '@/core/i18n/locale';
import { uuidv7 } from '@/core/offline/ids';
import { localDate } from '@/lib/dates';
import { useViewerTimezone } from '@/core/timezone/client';
import { requestDueAt } from '../request-dates';
import { sendRequest } from '../data/request-actions';
import { messages } from '../requests/messages';
import type { SendRequestInput } from '../request-types';
export function RequestPicker({forms,playerId,onSent,onCancel,onSend,now = new Date()}:{forms:{id:string;title:string}[];playerId:string;
  locale:Locale;onSent:()=>void;onCancel:()=>void;onSend:(row:SendRequestInput,commit:()=>Promise<void>)=>Promise<boolean>;now?:Date}) {
  const timezone = useViewerTimezone();
  const t = useT(messages);
  const [id] = useState(uuidv7), [form,setForm] = useState(forms[0]?.id ?? ''),[due,setDue] = useState('');
  const [state,setState] = useState<'ready'|'sending'|'error'>('ready');
  const busy = useRef(false);
  async function send() {
    if (busy.current || !form) return;
    busy.current = true;setState('sending');
    try {
      const row = {id,form_id:form,player_id:playerId,due_at:requestDueAt(due,timezone)};
      const ok = await onSend(row,async () => {if (!(await sendRequest(row)).ok) throw new Error('send');});
      if (!ok) throw new Error('send');
      onSent();
    } catch {setState('error');}
    finally {busy.current = false;}
  }
  return <form className="glass-strong space-y-card-gap rounded-card p-card" onSubmit={e => {e.preventDefault();void send();}}>
    <fieldset disabled={state === 'sending'} className="space-y-card-gap">
      <label className="block">{t('pick')}<select className="mt-inline min-h-12 w-full rounded-control bg-surface p-stack" value={form} onChange={e => setForm(e.target.value)}>
        {forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}</select></label>
      {!forms.length && <p>{t('empty')}</p>}
      <label className="block">{t('due')}<input type="date" min={localDate(now,timezone)} value={due} onChange={e => setDue(e.target.value)} className="ms-stack min-h-12 rounded-control bg-surface p-stack" /></label>
      {state === 'error' && <p role="alert" className="text-danger">{t('error')}</p>}
      <div className="flex gap-stack"><Button type="submit" disabled={!form || state === 'sending'}>{state === 'sending' ? t('sending') : t('send')}</Button>
        <Button variant="secondary" type="button" onClick={onCancel} className="min-h-12 px-page-x">{t('cancel')}</Button></div>
    </fieldset>
  </form>;
}

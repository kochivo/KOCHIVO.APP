'use client';
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
export function RequestPicker({forms,playerId,locale,onSent,onCancel,onSend,now = new Date()}:{forms:{id:string;title:string}[];playerId:string;
  locale:Locale;onSent:()=>void;onCancel:()=>void;onSend:(row:SendRequestInput,commit:()=>Promise<void>)=>Promise<boolean>;now?:Date}) {
  const timezone = useViewerTimezone();
  const m = messages[locale];
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
  return <form className="glass-strong space-y-4 rounded-card p-5" onSubmit={e => {e.preventDefault();void send();}}>
    <fieldset disabled={state === 'sending'} className="space-y-4">
      <label className="block">{m.pick}<select className="mt-2 min-h-12 w-full rounded-control bg-surface p-3" value={form} onChange={e => setForm(e.target.value)}>
        {forms.map(f => <option key={f.id} value={f.id}>{f.title}</option>)}</select></label>
      {!forms.length && <p>{m.empty}</p>}
      <label className="block">{m.due}<input type="date" min={localDate(now,timezone)} value={due} onChange={e => setDue(e.target.value)} className="ms-3 min-h-12 rounded-control bg-surface p-3" /></label>
      {state === 'error' && <p role="alert" className="text-danger">{m.error}</p>}
      <div className="flex gap-3"><button disabled={!form} className="min-h-12 rounded-control bg-lime-soft px-5 font-bold text-lime">{state === 'sending' ? m.sending : m.send}</button>
        <Button variant="secondary" type="button" onClick={onCancel} className="min-h-12 px-5">{m.cancel}</Button></div>
    </fieldset>
  </form>;
}

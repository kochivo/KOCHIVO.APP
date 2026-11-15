import { useState } from 'react';
import { useT } from '@/core/i18n/client';
import { GlassCard } from '@/ui/glass-card';
import { Button } from '@/ui/button';
import { TextField } from '@/ui/text-field';
import { KoSend } from '@/ui/icons/ko-send';
import { guidedMessages } from './messages';
import type { PaneProps } from './types';

export function Chat({ state, dispatch, act, now, phone = false }: PaneProps & { phone?: boolean }) {
  const t = useT(guidedMessages), [draft, setDraft] = useState('');
  const thread = phone ? 'mohamed' : state.chat;
  const initial = thread === 'mohamed' ? [t('initialCoach'), t('initialPlayer')] : [t(thread === 'sara' ? 'saraMessage' : 'omarMessage')];
  const send = (text: string) => { if (text.trim()) { act(phone ? 'reply' : 'send', text); setDraft(''); } };
  return <div className={`grid min-w-0 gap-card-gap ${phone ? '' : 'min-[1200px]:grid-cols-[180px_1fr]'}`}>
    {!phone && <GlassCard className="grid content-start gap-stack p-card"><h3>{t('conversations')}</h3>{(['mohamed', 'sara', 'omar'] as const).map((chat, i) => <Button key={chat} variant="secondary" aria-pressed={state.chat === chat} onClick={() => dispatch({ type: 'patch', patch: { chat } })}>{t('names').split('|')[i]}</Button>)}</GlassCard>}
    <GlassCard className="grid min-w-0 gap-stack p-card">
      <header className="flex flex-wrap items-center justify-between gap-inline"><b>{phone ? t('captainName') : t('names').split('|')[['mohamed', 'sara', 'omar'].indexOf(thread)]}</b>{!phone && <Button variant="secondary" onClick={() => dispatch({ type: 'go', page: 'player', now: now() })}>{t('file')}</Button>}</header>
      <div className="grid max-h-64 gap-stack overflow-auto" aria-live="polite">{initial.map((text, i) => <p key={text} className={`max-w-[90%] rounded-control p-stack text-sm ${i === 1 ? 'ms-auto bg-lime-soft' : 'recessed'}`}>{text}</p>)}
        {state.threads[thread].map((message, i) => <p key={i} className={`max-w-[90%] break-words rounded-control p-stack text-sm ${message.from === (phone ? 'player' : 'captain') ? 'ms-auto bg-lime-soft' : 'recessed'}`}>{message.text}</p>)}
      </div>
      {!phone && <div className="flex flex-wrap gap-inline">{t('quick').split('|').map(text => <Button variant="secondary" key={text} onClick={() => send(text)}>{text}</Button>)}</div>}
      <form data-demo-target={phone ? undefined : 'composer'} className="flex min-w-0 items-end gap-inline" onSubmit={e => { e.preventDefault(); send(draft); }}>
        <div className="min-w-0 flex-1"><TextField label={t('message')} value={draft} onChange={e => setDraft(e.target.value)} /></div>
        <Button type="submit" block={false} aria-label={t('send')} disabled={!draft.trim()}><KoSend className="size-5" /></Button>
      </form>
    </GlassCard>
  </div>;
}

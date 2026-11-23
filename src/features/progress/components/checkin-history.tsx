'use client';
import { useCallback, useEffect, useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { VoiceNoteList, listContextVoiceNotes, markListened } from '@/features/voice-notes';
import type { VoiceNote } from '@/features/voice-notes';
import { ErrorState, LoadingState } from '@/ui';
import { formatDateAr } from '@/lib/dates';
import type { CheckIn } from '../data/checkins';
import { messages } from '../messages';

type Load = { status: 'loading' } | { status: 'error' } | { status: 'ready'; groups: Record<string, VoiceNote[]> };
const currentTime = () => new Date();
export function CheckinHistory({ checkins, now = currentTime }: { checkins: CheckIn[]; now?: () => Date }) {
  const t = useT(messages);
  const locale = useLocale();
  const [load, setLoad] = useState<Load>({ status: 'loading' });
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let active = true;
    async function fetchNotes() {
      setLoad({ status: 'loading' });
      try {
        const ids = checkins.filter(row => row.reviewed_at).map(row => row.id);
        const groups = ids.length ? await listContextVoiceNotes(await loadSupabaseBrowser(), 'checkin', ids) : {};
        if (active) setLoad({ status: 'ready', groups });
      } catch { if (active) setLoad({ status: 'error' }); }
    }
    void fetchNotes();
    return () => { active = false; };
  }, [checkins, retry]);
  const played = useCallback((note: VoiceNote) => {
    if (note.listenedAt) return;
    const listenedAt = now();
    void loadSupabaseBrowser().then(client => markListened(client, note.id, listenedAt)).catch(error => console.warn('Marking voice note listened failed', error));
    setLoad(current => current.status !== 'ready' || !note.contextId ? current : { status: 'ready', groups: {
      ...current.groups, [note.contextId]: (current.groups[note.contextId] ?? []).map(row => row.id === note.id ? { ...row, listenedAt: listenedAt.toISOString() } : row),
    } });
  }, [now]);
  return <section className="space-y-stack" aria-label={t('checkinHistory')}>
    <h2 className="font-bold">{t('checkinHistory')}</h2>
    {!checkins.length && <p className="text-muted">{t('firstCheckin')}</p>}
    {load.status === 'loading' && <LoadingState variant="list" />}
    {load.status === 'error' && <ErrorState message={t('voiceLoadFailed')} retryLabel={t('tryAgain')} onRetry={() => setRetry(value => value + 1)} />}
    <ul className="space-y-stack">{checkins.map(row => <li key={row.id} className="glass space-y-stack rounded-card p-card">
      <time dateTime={row.week_start} className="text-sm text-muted">{formatDateAr(row.week_start, { day: 'numeric', month: 'long' }, locale)}</time>
      {row.pending && <p className="text-sm text-muted"><span className="rounded-full bg-ink/5 px-inline text-xs font-bold">{t('checkinPending')}</span> {t('checkinSavedOnDevice')}</p>}
      <p className="whitespace-pre-wrap">{row.reviewed_at ? row.captain_reply || t('voiceReply') : t('noReplyYet')}</p>
      {row.reviewed_at && load.status === 'ready' && ((load.groups[row.id]?.length ?? 0) > 0 ?
        <VoiceNoteList notes={load.groups[row.id] ?? []} onPlay={played} /> : <p className="text-sm text-muted">{t('noVoiceReply')}</p>)}
    </li>)}</ul>
  </section>;
}

'use client';

import Link from 'next/link';
import { Play } from 'lucide-react';
import { useCallback } from 'react';
import type { VoiceNote } from '@/features/voice-notes';
import { useResource } from '@/core/resource';
import { loadSupabaseBrowser } from '@/core/supabase/lazy';
import { useTimezone } from '@/core/timezone/client';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { buttonClass } from '@/ui/button';

export function CaptainRow({ name, note, unheard = false, playerId, captainId }: {
  name?: string; note?: VoiceNote; unheard?: boolean; playerId?: string; captainId?: string;
}) {
  const t = useT(messages);
  const timezone = useTimezone();
  const loader = useCallback(async () => {
    if (!playerId || !captainId) return { latest: null, unread: false };
    const db = await loadSupabaseBrowser();
    const { listVoiceNotes, loadCaptainThreadReplies } = await import('@/features/voice-notes');
    // Query incoming messages directly so a long run of outgoing messages cannot hide the latest reply.
    const [chat, notes, replies] = await Promise.all([
      db.from('chat_messages').select('id,body,audio_path,duration_seconds,created_at').eq('player_id', playerId)
        .eq('captain_id', captainId).eq('sender_id', captainId).order('created_at', { ascending: false }).order('id', { ascending: false }).limit(1),
      listVoiceNotes(db, playerId), loadCaptainThreadReplies(db, playerId),
    ]);
    if (chat.error) throw chat.error;
    const latest = [...(chat.data ?? []).map(item => ({ id: item.id, createdAt: item.created_at,
      body: item.body, voice: Boolean(item.audio_path), durationSeconds: item.duration_seconds ?? 0 })),
      ...replies.flatMap(item => item.captain_reply?.trim() && item.reviewed_at
        ? [{ id: item.id, createdAt: item.reviewed_at, body: item.captain_reply, voice: false, durationSeconds: 0 }] : []),
      ...notes.map(item => ({ ...item, body: null, voice: true }))]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id))[0] ?? null;
    const unread = await db.from('chat_messages').select('id', { count: 'exact', head: true })
      .eq('player_id', playerId).eq('captain_id', captainId).neq('sender_id', playerId).is('read_at', null);
    if (unread.error) throw unread.error;
    return { latest, unread: Boolean(unread.count) || notes.some(item => !item.listenedAt) };
  }, [playerId, captainId]);
  const result = useResource(playerId && captainId ? `home-chat:${playerId}:${captainId}` : null, loader, { pollMs: 15000 });
  const latest = result.data?.latest ?? (note ? { ...note, voice: true, body: null } : null);
  if (result.status === 'error') return <ErrorState message={t('homeVoiceError')} retryLabel={t('tryAgain')} onRetry={() => void result.retry()} />;
  if (!result.data && playerId && captainId) return <LoadingState variant="detail" />;
  if (!latest) return null;
  const unread = result.data?.unread || unheard;
  const seconds = Math.max(0, Math.floor(latest.durationSeconds));
  const duration = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return <Link href="/player/captain" aria-label={unread ? t('homeUnheard') : undefined} className={buttonClass({ variant: 'secondary', block: false, className: "flex min-h-12 items-center gap-3 bg-surface px-3.5 py-3 text-ink" })}>
    <span aria-hidden className="relative flex size-11 shrink-0 items-center justify-center rounded-full bg-lime-soft font-extrabold text-lime">{name?.slice(0, 1) || t('streakInitial')}
      {unread && <span data-unheard className="absolute end-0 top-0 size-[11px] rounded-full border-2 border-surface bg-lime" />}</span>
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <b className="text-[13px]">{name ? t('homeCaptain', { name }) : t('captainTitle')}</b>
      <span className="truncate text-xs text-muted">{latest.voice ? t('homeVoice', { duration }) : latest.body}</span>
      <time dateTime={latest.createdAt} dir="ltr" className="font-display text-[10px] text-faint">{new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', timeZone: timezone }).format(new Date(latest.createdAt))}</time>
    </span>
    {latest.voice && <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-on-lime"><Play className="size-4 fill-current" /></span>}
  </Link>;
}

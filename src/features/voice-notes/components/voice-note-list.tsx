'use client';
import { useTimezone } from '@/core/timezone/client';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useState } from 'react';
import { AudioPlayer } from '@/ui/audio-player';
import { formatDateAr, localDate } from '@/lib/dates';
import { clock } from '../audio';
import type { VoiceNote } from '../types';
import type { ThreadItem } from '../player-thread';
import { CaptainThread } from './captain-thread';

export function VoiceNoteList({ notes, onPlay, replies, thread }: { notes: VoiceNote[]; onPlay?: (note: VoiceNote) => void; replies?: Record<string, string>; thread?: ThreadItem[] }) {
  const timezone = useTimezone();
  const t = useT(messages);
  const locale = useLocale();
  const [broken, setBroken] = useState<string | null>(null);
  if (thread) return <CaptainThread items={thread} onPlay={onPlay} />;
  return (
    <ul className="space-y-stack">
      {notes.map((note) => <li key={note.id} className="space-y-inline">
        <p className="flex items-center gap-inline text-xs text-muted">
          <time dateTime={note.createdAt}>{formatDateAr(localDate(new Date(note.createdAt), timezone),{ day: 'numeric', month: 'long' }, locale)}</time>
          {!note.listenedAt && onPlay && <span className="rounded-full bg-lime-soft px-inline py-inline font-bold text-lime">{t('newNote')}</span>}
        </p>
        <AudioPlayer src={note.url} mimeType={note.mimeType} durationSeconds={note.durationSeconds} playLabel={t('play')} pauseLabel={t('pause')}
          formatTime={clock} onPlay={() => onPlay?.(note)} onError={() => setBroken(note.id)} />
        {note.contextId && replies?.[note.contextId] && <p className="whitespace-pre-wrap break-words pt-inline text-xs text-muted">{replies[note.contextId]}</p>}
        {broken === note.id && <p role="alert" className="text-xs text-danger">{t('playFailed')}</p>}
      </li>)}
    </ul>
  );
}

'use client';
import { useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { AudioPlayer } from '@/ui/audio-player';
import { formatDateAr, localDate } from '@/lib/dates';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import { clock } from '../audio';
import { threadDay } from '../player-thread';
import type { ThreadItem } from '../player-thread';
import type { VoiceNote } from '../types';
import { messages } from '../thread-messages';
import { messages as voiceMessages } from '../messages';

const heights = [8, 16, 24, 12, 20, 8, 16, 6, 22, 12, 4, 16, 10, 20, 8];

export function CaptainThread({ items, onPlay }: { items: ThreadItem[]; onPlay?: (note: VoiceNote) => void }) {
  const t = useT(messages);
  const voiceT = useT(voiceMessages);
  const locale = useLocale();
  const timezone = useTimezone();
  const { now } = useCalendarClock();
  const [broken, setBroken] = useState<string | null>(null);
  return <ol aria-label={t('thread')} className="flex flex-col gap-stack pt-inline">
    {items.map((item, index) => {
      const date = localDate(new Date(item.createdAt), timezone);
      const previous = items[index - 1];
      const separator = !previous || localDate(new Date(previous.createdAt), timezone) !== date;
      const label = now ? threadDay(item.createdAt, now, timezone) : date;
      return <li key={item.id} className="flex flex-col items-start gap-stack">
        {separator && <time dateTime={date} className="self-center text-micro text-faint">{label === 'today' || label === 'yesterday'
          ? t(label) : formatDateAr(date, { day: 'numeric', month: 'long', year: 'numeric' }, locale)}</time>}
        {item.kind === 'reply' ? <p className="max-w-[82%] whitespace-pre-wrap break-words rounded-[22px] rounded-es-[6px] bg-surface-raised px-card py-stack text-sm leading-[1.6]">{item.text}</p> :
          <div className="relative w-[292px] max-w-[82%]">
            <AudioPlayer src={item.note.url} mimeType={item.note.mimeType} durationSeconds={item.note.durationSeconds}
              playLabel={t('play')} pauseLabel={t('pause')} formatTime={clock} onPlay={() => onPlay?.(item.note)} onError={() => setBroken(item.id)}
              className="gap-stack! rounded-[22px]! rounded-es-[6px]! border-0! bg-surface-raised! px-stack! py-stack! shadow-none! [&_[role=progressbar]]:opacity-0 [&>span]:text-xs [&>button]:rounded-full" />
            <svg aria-hidden viewBox="0 0 130 26" className="pointer-events-none absolute start-[70px] top-[21px] h-[26px] w-[calc(100%-122px)] max-w-[130px] fill-faint">
              {heights.map((height, i) => <rect key={i} x={i * 9} y={(26 - height) / 2} width={4} height={height} rx={2} />)}
            </svg>
          </div>}
        {broken === item.id && <p role="alert" className="text-xs text-danger">{voiceT('playFailed')}</p>}
      </li>;
    })}
  </ol>;
}

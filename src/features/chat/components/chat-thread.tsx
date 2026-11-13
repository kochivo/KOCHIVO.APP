'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Check, CheckCheck } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { threadDay, voiceNoteMessages } from '@/features/voice-notes';
import { AudioPlayer } from '@/ui/audio-player';
import { localDate, formatDateAr } from '@/lib/dates';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import type { ChatThreadItem } from '../types';
import { messages } from '../messages';

const heights = [8, 16, 24, 12, 20, 8, 16, 6, 22, 12, 4, 16, 10];
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
export function ChatThread({ items, viewer, onRetry, onVoicePlay }: {
  items: readonly ChatThreadItem[]; viewer: 'player' | 'captain'; onRetry?: (id: string) => unknown;
  onVoicePlay?: (item: ChatThreadItem) => void;
}) {
  const t = useT(messages), voiceT = useT(voiceNoteMessages);
  const locale = useLocale(), timezone = useTimezone();
  const { now } = useCalendarClock();
  const bottom = useRef<HTMLDivElement>(null);
  const [broken, setBroken] = useState<string | null>(null);
  const lastRead = items.findLast(item => item.mine && item.readAt && item.status === 'sent')?.id;
  const tail = items.at(-1)?.id;
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [tail]);
  return <div className="pb-40">
    {!items.length && <p className="py-8 text-center text-sm text-muted">{t(viewer === 'player' ? 'empty' : 'emptyCaptain')}</p>}
    <ol aria-label={t('thread')} className="flex flex-col gap-2.5 pt-1">
      {items.map((item, index) => {
        const date = localDate(new Date(item.createdAt), timezone);
        const previous = items[index - 1];
        const day = now ? threadDay(item.createdAt, now, timezone) : date;
        const own = item.mine;
        return <Fragment key={item.id}>
          {(!previous || localDate(new Date(previous.createdAt), timezone) !== date) && <li className="self-center text-[11px] text-faint">
            <time dateTime={date}>{day === 'today' || day === 'yesterday' ? t(day) : formatDateAr(date, { day: 'numeric', month: 'long', year: 'numeric' }, locale)}</time>
          </li>}
          <li className={`flex max-w-[82%] flex-col gap-1 ${own ? 'self-end' : 'self-start'}`}>
            <div className={`rounded-[22px] text-sm leading-[1.6] ${own ? 'rounded-ee-[6px] bg-lime font-semibold text-on-lime' : 'rounded-es-[6px] bg-surface-raised text-ink'} ${item.kind === 'text' ? 'px-3.5 py-3' : 'px-3 py-2.5'}`}>
              {item.kind === 'text' ? <p className="whitespace-pre-wrap break-words">{item.body}</p> : <div className="relative w-[240px] max-w-full">
                <AudioPlayer src={item.url ?? ''} durationSeconds={item.durationSeconds ?? 0} playLabel={voiceT('play')} pauseLabel={voiceT('pause')}
                  formatTime={clock} onPlay={() => onVoicePlay?.(item)} onError={() => setBroken(item.id)}
                  className={`gap-2.5! rounded-none! border-0! bg-transparent! p-0! shadow-none! [&_[role=progressbar]]:opacity-0 [&>span]:font-display [&>span]:text-xs [&>button]:rounded-full ${own ? '[&>button]:bg-on-lime [&>button]:text-lime [&>span]:text-on-lime' : ''}`} />
                <svg aria-hidden viewBox="0 0 120 26" className={`pointer-events-none absolute start-[58px] top-[11px] h-[26px] w-[calc(100%-105px)] ${own ? 'fill-on-lime/55' : 'fill-faint'}`}>
                  {heights.map((height, i) => <rect key={i} x={i * 9} y={(26 - height) / 2} width={4} height={height} rx={2} />)}
                </svg>
              </div>}
              <div dir="ltr" className={`mt-1 flex items-center gap-1 font-display text-[10px] opacity-70 ${own ? 'justify-end' : ''}`}>
                <time dateTime={item.createdAt}>{new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', timeZone: timezone }).format(new Date(item.createdAt))}</time>
                {own && item.status === 'sent' && (item.readAt ? <CheckCheck aria-label={t('read')} className="size-4" /> : <Check aria-label={t('sent')} className="size-4" />)}
                {own && item.status === 'sending' && <span>{t('sending')}</span>}
              </div>
            </div>
            {broken === item.id && <p role="alert" className="text-xs text-danger">{voiceT('playFailed')}</p>}
            {item.status === 'failed' && <button type="button" onClick={() => onRetry?.(item.id)} className="min-h-12 text-start text-xs text-danger">{t('failed')}</button>}
            {lastRead === item.id && <span className="self-end text-[11px] text-faint">{t('read')}</span>}
          </li>
        </Fragment>;
      })}
    </ol><div ref={bottom} className="scroll-mb-44" />
  </div>;
}

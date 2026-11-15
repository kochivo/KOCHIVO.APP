'use client';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Check, CheckCheck } from 'lucide-react';
import type { Locale } from '@/core/i18n/locale';
import type { Translator } from '@/core/i18n/messages';
// eslint-disable-next-line no-restricted-imports -- T-288 keeps shared chat rendering away from the data barrel.
import { threadDay } from '@/features/voice-notes/player-thread';
// eslint-disable-next-line no-restricted-imports -- Message types only.
import type { messages as voiceNoteMessages } from '@/features/voice-notes/messages';
import { AudioPlayer } from '@/ui/audio-player';
import { localDate, formatDateAr } from '@/lib/dates';
import type { ChatThreadItem } from '../types';
import type { messages } from '../messages';

const heights = [8, 16, 24, 12, 20, 8, 16, 6, 22, 12, 4, 16, 10];
const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
export function ChatThreadView({ items, viewer, onRetry, onVoicePlay, t, voiceT, locale, timezone, now }: {
  t: Translator<typeof messages>; voiceT: Translator<typeof voiceNoteMessages>; locale: Locale; timezone: string; now: Date | null | undefined;
  items: readonly ChatThreadItem[]; viewer: 'player' | 'captain'; onRetry?: (id: string) => unknown;
  onVoicePlay?: (item: ChatThreadItem) => void;
}) {
  const bottom = useRef<HTMLDivElement>(null);
  const [broken, setBroken] = useState<string | null>(null);
  const lastRead = items.findLast(item => item.mine && item.readAt && item.status === 'sent')?.id;
  const tail = items.at(-1)?.id;
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'end' }); }, [tail]);
  return <div className={viewer === 'captain' ? 'pb-[calc(var(--nav-clearance)+5rem)] min-[760px]:pb-28 lg:pb-card' : 'pb-40'}>
    {!items.length && <p className="py-page-y text-center text-sm text-muted">{t(viewer === 'player' ? 'empty' : 'emptyCaptain')}</p>}
    <ol aria-label={t('thread')} className="flex flex-col gap-stack pt-inline">
      {items.map((item, index) => {
        const date = localDate(new Date(item.createdAt), timezone);
        const previous = items[index - 1];
        const day = now ? threadDay(item.createdAt, now, timezone) : date;
        const own = item.mine;
        const lime = own && viewer === 'player';
        return <Fragment key={item.id}>
          {(!previous || localDate(new Date(previous.createdAt), timezone) !== date) && <li className="self-center text-micro text-faint">
            <time dateTime={date}>{day === 'today' || day === 'yesterday' ? t(day) : formatDateAr(date, { day: 'numeric', month: 'long', year: 'numeric' }, locale)}</time>
          </li>}
          <li className={`flex max-w-[82%] flex-col gap-inline ${own ? 'self-end' : 'self-start'}`}>
            <div className={`rounded-[22px] text-sm leading-[1.6] ${own ? 'rounded-ee-[6px]' : 'rounded-es-[6px]'} ${lime ? 'bg-lime font-semibold text-on-lime' : viewer === 'captain' && !own ? 'border border-line-soft bg-surface text-ink' : 'bg-surface-raised text-ink'} ${item.kind === 'text' ? 'px-card py-stack' : 'px-stack py-stack'}`}>
              {item.kind === 'text' ? <p className="whitespace-pre-wrap break-words">{item.body}</p> : <div className="relative w-[240px] max-w-full">
                <AudioPlayer src={item.url ?? ''} durationSeconds={item.durationSeconds ?? 0} playLabel={voiceT('play')} pauseLabel={voiceT('pause')}
                  formatTime={clock} onPlay={() => onVoicePlay?.(item)} onError={() => setBroken(item.id)}
                  className={`gap-stack! rounded-none! border-0! bg-transparent! p-0! shadow-none! [&_[role=progressbar]]:opacity-0 [&>span]:font-display [&>span]:text-xs [&>button]:rounded-full ${lime ? '[&>button]:bg-on-lime [&>button]:text-lime [&>span]:text-on-lime' : ''}`} />
                <svg aria-hidden viewBox="0 0 120 26" className={`pointer-events-none absolute start-[58px] top-[11px] h-[26px] w-[calc(100%-105px)] ${lime ? 'fill-on-lime/55' : 'fill-faint'}`}>
                  {heights.map((height, i) => <rect key={i} x={i * 9} y={(26 - height) / 2} width={4} height={height} rx={2} />)}
                </svg>
              </div>}
              <div dir="ltr" className={`mt-inline flex items-center gap-inline font-display text-micro opacity-70 ${own ? 'justify-end' : ''}`}>
                <time dateTime={item.createdAt}>{new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', timeZone: timezone }).format(new Date(item.createdAt))}</time>
                {own && item.status === 'sent' && (item.readAt ? <CheckCheck aria-label={t('read')} className="size-4" /> : <Check aria-label={t('sent')} className="size-4" />)}
                {own && item.status === 'sending' && <span>{t('sending')}</span>}
              </div>
            </div>
            {broken === item.id && <p role="alert" className="text-xs text-danger">{voiceT('playFailed')}</p>}
            {item.status === 'failed' && <button type="button" onClick={() => onRetry?.(item.id)} className="min-h-12 text-start text-xs text-danger">{t('failed')}</button>}
            {lastRead === item.id && <span className="self-end text-micro text-faint">{t('read')}</span>}
          </li>
        </Fragment>;
      })}
    </ol><div ref={bottom} className="scroll-mb-44" />
  </div>;
}

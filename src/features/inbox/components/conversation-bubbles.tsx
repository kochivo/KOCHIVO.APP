'use client';
import { secondaryButtonClass } from '@/ui/secondary-button-class';
import { Fragment, useEffect, useRef, useState } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { AudioPlayer } from '@/ui/audio-player';
import type { ChatThreadItem } from '@/features/chat';
import { conversationMessages } from '../conversation-messages';
import { voiceDuration } from '../conversation-preview';
import { conversationDays, conversationDayLabel } from '../conversation-dates';

const heights = [8, 16, 12, 18, 8, 14, 6, 18, 10, 4, 16, 10, 18, 8, 12, 6, 16, 10, 18, 6, 12, 16, 8, 14];
export function ConversationBubbles({ items, onRetry, now = new Date() }: { items: readonly ChatThreadItem[]; onRetry: (id: string) => unknown; now?: Date }) {
  const t = useT(conversationMessages), timezone = useTimezone(), locale = useLocale();
  const [broken, setBroken] = useState<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const tail = items.at(-1)?.id;
  useEffect(() => { bottom.current?.scrollIntoView({ block: 'nearest' }); }, [tail]);
  return <div className="min-h-0 flex-1 overflow-y-auto p-card max-md:px-0">
    {!items.length && <p className="p-section text-center text-xs text-muted">{t('emptyThread')}</p>}
    <ol aria-label={t('thread')} className="flex flex-col gap-inline max-md:min-h-full max-md:justify-end">
      {conversationDays(items, timezone).map(group => <Fragment key={group.date}>
        <li className="self-center py-inline text-xs text-muted"><time dateTime={group.date}>{conversationDayLabel(group.date, now, timezone, locale, t)}</time></li>
        {group.items.map(item => <li key={item.id} className={`glass max-w-[85%] md:max-w-[70%] rounded-card px-card py-stack text-sm leading-[1.7] max-md:max-w-[78%] max-md:px-card-gap max-md:text-row ${item.mine ? 'self-end rounded-se-sm border border-lime/20 bg-lime-soft bg-none text-ink' : 'self-start rounded-ss-sm max-md:rounded-ss-card max-md:rounded-ee-sm max-md:border-0 max-md:bg-surface-raised max-md:bg-none max-md:shadow-none'}`}>
        {item.kind === 'text' ? <p className="whitespace-pre-wrap break-words">{item.body}</p> : <div className="relative w-[220px] max-w-full">
          <AudioPlayer src={item.url ?? ''} durationSeconds={item.durationSeconds ?? 0} playLabel={t('play')} pauseLabel={t('pause')}
            formatTime={voiceDuration} onError={() => setBroken(item.id)}
            className={`gap-inline! rounded-none! border-0! bg-transparent! p-0! shadow-none! [&_[role=progressbar]]:opacity-0 [&>span]:text-micro [&>button]:rounded-full ${item.mine ? '[&>button]:bg-lime-soft [&>button]:text-ink [&>span]:text-ink' : '[&>button]:bg-transparent [&>button]:text-ink'}`} />
          <svg aria-hidden viewBox="0 0 120 18" className="pointer-events-none absolute start-[54px] top-[15px] h-[18px] w-[calc(100%-95px)] fill-current opacity-60">
            {heights.map((height, index) => <rect key={index} x={index * 5} y={(18 - height) / 2} width={2} height={height} />)}
          </svg>
        </div>}
        <time dateTime={item.createdAt} dir="ltr" className="block text-start font-display text-micro opacity-60">
          {new Intl.DateTimeFormat('en-GB', { hour: 'numeric', minute: '2-digit', timeZone: timezone }).format(new Date(item.createdAt))}
        </time>
        {broken === item.id && <p role="alert">{t('playFailed')}</p>}
        {item.status === 'sending' && <p role="status" className="text-micro">{t('sending')}</p>}
        {item.status === 'failed' && <button type="button" className={`${secondaryButtonClass} min-h-12 text-start underline`} onClick={() => onRetry(item.id)}>{t('failed')}</button>}
      </li>)}</Fragment>)}
    </ol><div ref={bottom} />
  </div>;
}

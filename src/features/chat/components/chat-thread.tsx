'use client';
import type { ComponentProps } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { useTimezone } from '@/core/timezone/client';
import { voiceNoteMessages } from '@/features/voice-notes';
import { useCalendarClock } from '@/lib/use-calendar-clock';
import { messages } from '../messages';
import { ChatThreadView } from './chat-thread-view';

export function ChatThread(props: Omit<ComponentProps<typeof ChatThreadView>, 't' | 'voiceT' | 'locale' | 'timezone' | 'now'>) {
  const t = useT(messages), voiceT = useT(voiceNoteMessages);
  const locale = useLocale(), timezone = useTimezone(), { now } = useCalendarClock();
  return <ChatThreadView {...props} t={t} voiceT={voiceT} locale={locale} timezone={timezone} now={now} />;
}

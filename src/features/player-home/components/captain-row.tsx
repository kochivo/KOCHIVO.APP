'use client';

import Link from 'next/link';
import { Play } from 'lucide-react';
import type { VoiceNote } from '@/features/voice-notes';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

export function CaptainRow({ name, note }: { name?: string; note?: VoiceNote }) {
  const t = useT(messages);
  if (!note) return null;
  const seconds = Math.max(0, Math.floor(note.durationSeconds));
  const duration = `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  return <Link href="/player/captain" className="flex items-center gap-3 rounded-[24px] border border-line-soft bg-surface px-3.5 py-3 text-ink">
    <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-lime-soft font-extrabold text-lime">{name?.slice(0, 1) || t('streakInitial')}</span>
    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
      <b className="text-[13px]">{name ? t('homeCaptain', { name }) : t('captainTitle')}</b>
      <span className="truncate text-xs text-muted">{t('homeVoice', { duration })}</span>
    </span>
    <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-ink text-on-lime"><Play className="size-4 fill-current" /></span>
  </Link>;
}

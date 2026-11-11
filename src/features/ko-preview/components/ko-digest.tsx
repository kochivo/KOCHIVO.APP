'use client';

import type { ReactNode } from 'react';
import { useLocale, useT } from '@/core/i18n/client';
import { buildDigest } from '@/features/ko-feed';
import type { DigestExtras } from '@/features/ko-feed';
import { koFeedMessages as messages } from '@/features/ko-feed';
import type { KoFeedItem } from '@/features/ko-feed';

export function KoDigest({ rows, extras, avatar }: { rows: KoFeedItem[]; extras: DigestExtras | null; avatar: ReactNode }) {
  const locale = useLocale();
  const t = useT(messages);
  return <section aria-label={t('digestTitle')} className="glass-strong flex items-start gap-3 rounded-card p-4 text-start">
    <span className="shrink-0">{avatar}</span>
    <ul className="space-y-2 text-sm">{buildDigest(rows, extras, locale).map((line, index) => <li key={index}>{line}</li>)}</ul>
  </section>;
}

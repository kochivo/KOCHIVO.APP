import type { Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import type { LeaderboardRow } from '@/features/ranks';
import { ranksEnabled } from '@/lib/ranks-enabled';
import { messages } from './messages';
import type { KoFeedItem } from './types';

export type DigestRecord = { player_name: string; exercise: { ar: string; en: string } };
export type DigestExtras = { board: LeaderboardRow[]; records: DigestRecord[] };

export function buildDigest(rows: KoFeedItem[], extras: DigestExtras | null, locale: Locale): string[] {
  const t = createT(messages, locale);
  const lines: string[] = [];
  const inactive = new Set(rows.filter(row => row.kind === 'inactive').map(row => row.player_id)).size;
  const subscriptions = new Set(rows.filter(row => row.kind === 'expiring' || row.kind === 'expired').map(row => row.player_id)).size;
  if (inactive) lines.push(t('digestInactive', { n: inactive }));
  if (subscriptions) lines.push(t('digestSubscriptions', { n: subscriptions }));
  const records = extras?.records ?? [];
  const first = records[0];
  if (first && records.length === 1) lines.push(t('digestRecord', { name: first.player_name, exercise: first.exercise[locale] }));
  else if (records.length) lines.push(t('digestRecords', { n: records.length }));
  const crown = extras?.board.find(row => row.is_crown);
  if (crown && ranksEnabled()) lines.push(t('digestCrown', { name: crown.display_name, adherence: crown.adherence }));
  return lines.length ? lines : [t('digestClear')];
}

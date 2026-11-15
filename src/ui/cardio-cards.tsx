'use client';

import type { SnapshotDay } from '@/core/offline';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { messages } from './messages';

export function CardioCards({ blocks }: { blocks: NonNullable<SnapshotDay['cardio']> }) {
  const t = useT(messages);
  const locale = useLocale();
  if (!blocks.length) return null;
  return <section aria-label={t('cardio')} className="space-y-stack">
    <h3 className="font-bold">{t('cardio')}</h3>
    <ol className="space-y-stack">{blocks.map(block => <li key={block.id} className="glass space-y-inline rounded-card p-card">
      <h4 className="break-words font-bold">{block.kind}</h4>
      <p className="text-muted">{t('cardioDuration', { count: formatNumber(block.minutes, locale) })} · {t(
        block.intensity === 'high' ? 'high' : block.intensity === 'moderate' ? 'moderate' : 'low')}</p>
      {block.notes && <p className="whitespace-pre-wrap break-words">{block.notes}</p>}
    </li>)}</ol>
  </section>;
}

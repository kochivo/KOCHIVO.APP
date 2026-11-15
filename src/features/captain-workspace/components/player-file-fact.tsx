import type { ReactNode } from 'react';
import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import type { FactKey, PlayerFact } from '@/features/player-file';
import { messages } from '../messages';
import { factLabel, factValue, optionLabel, sourceLabel } from './player-file-format';

export function PlayerFileFact({ factKey, fact, locale, children, timezone }: {
  factKey: FactKey; fact?: PlayerFact; locale: Locale; children?: ReactNode; timezone?: string;
}) {
  const t = createT(messages, locale);
  const warning = factKey === 'injuries' || factKey === 'medical';
  const value = fact?.value;
  return <div className="space-y-inline border-b border-line pb-card">
    <div className="flex items-center gap-inline text-xs text-muted">
      <span>{factLabel(factKey, locale)}</span>
      {fact?.isNew && <span role="img" aria-label={t('newFact')} className="size-1.5 rounded-full bg-lime" />}
    </div>
    {children ?? (Array.isArray(value) && factKey !== 'trainingDays' ? <div className="flex flex-wrap gap-inline">
      {(value.length ? value : ['none']).map(item => <span key={item}
        className={`rounded-control px-inline py-inline text-sm ${warning && item !== 'none' ? 'bg-warn-soft text-warn' : 'glass-strong'}`}>
        {optionLabel(String(item), locale)}</span>)}
    </div> : factKey === 'note' ? <blockquote className="break-words text-sm leading-relaxed">{factValue(factKey, value, locale)}</blockquote> :
      <bdi dir={typeof value === 'number' ? 'ltr' : 'auto'} className="block font-bold tabular-nums">{factValue(factKey, value, locale)}</bdi>)}
    {fact?.previous && <div className="text-xs text-muted" aria-label={t('previousFact')}>
      <bdi dir={typeof fact.previous.value === 'number' ? 'ltr' : 'auto'}><del>{factValue(factKey, fact.previous.value, locale)}</del></bdi>
      <p>{sourceLabel(fact.previous.source, locale, timezone)}</p>
    </div>}
    {fact && <p className="text-xs text-muted">{sourceLabel(fact.source, locale, timezone)}</p>}
  </div>;
}

'use client';

import { useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import { useKoFeed } from '../hooks/use-ko-feed';
import { messages } from '../messages';
import { groupFeed, rankFeed } from '../rank';
import { FeedCard } from './feed-card';
import { KoDigest } from './ko-digest';

export function KoFeed({ avatar }: { avatar: (expression: 'thinking' | 'welcome' | 'cheer') => ReactNode }) {
  const t = useT(messages);
  const captain = /^\/(?:ar\/|en\/)?captain(?:\/|$)/.test(usePathname() ?? '');
  const { rows, status, saveError, refresh, dismiss, extras } = useKoFeed(true, true, captain);
  const [all, setAll] = useState(false);
  if (status === 'loading') return <p role="status" className="p-4 text-sm text-muted">{t('loading')}</p>;
  if (status === 'error') return <div className="p-4"><p role="alert" className="text-sm text-danger">{t('error')}</p><button type="button" onClick={() => void refresh()} className="min-h-12 text-lime-ink">{t('retry')}</button></div>;
  const groups = groupFeed(all ? rows : rankFeed(rows).slice(0, 5));
  const expression = groups.urgent.length ? 'thinking' : 'welcome';
  return <div data-ko-feed className="space-y-4 border-b border-line p-4 text-start">
    {captain && <KoDigest rows={rows} extras={extras ?? null} avatar={avatar('welcome')} />}
    {!rows.length && <div className="flex items-center gap-3">{avatar('cheer')}<p className="text-sm text-muted">{t('empty')}</p></div>}
    {(['urgent', 'generate'] as const).map(group => groups[group].length > 0 && <section key={group} aria-label={t(group)} className="space-y-2">
      <h2 className="flex items-center gap-2 text-sm font-bold">{avatar(expression)}{t(group)}</h2>
      {groups[group].map(item => <FeedCard key={item.key} item={item} onDismiss={key => void dismiss(key)} />)}
    </section>)}
    {!all && rows.length > 5 && <button type="button" onClick={() => setAll(true)} className="min-h-12 w-full text-sm text-lime-ink">{t('showAll')}</button>}
    {saveError && <p role="alert" className="text-sm text-danger">{t('saveError')}</p>}
  </div>;
}

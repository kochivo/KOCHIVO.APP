'use client';

import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { Button } from '@/ui/button';
import { useState } from 'react';
import type { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import { useKoFeed } from '@/features/ko-feed';
import { koFeedMessages as messages } from '@/features/ko-feed';
import { groupFeed, rankFeed } from '@/features/ko-feed';
import { FeedCard } from './feed-card';
import { KoDigest } from './ko-digest';

export function KoFeed({ avatar }: { avatar: (expression: 'thinking' | 'welcome' | 'cheer') => ReactNode }) {
  const t = useT(messages);
  const captain = /^\/(?:ar\/|en\/)?captain(?:\/|$)/.test(usePathname() ?? '');
  const { rows, status, saveError, refresh, dismiss, extras } = useKoFeed(true, true, captain);
  const [all, setAll] = useState(false);
  if (status === 'loading') return <p role="status" className="p-card text-sm text-muted">{t('loading')}</p>;
  if (status === 'error') return <div className="p-card"><p role="alert" className="text-sm text-danger">{t('error')}</p>{captainWorkspaceEnabled() ? <Button variant="secondary" type="button" onClick={() => void refresh()} className="min-h-12 text-ink">{t('retry')}</Button> : <button type="button" onClick={() => void refresh()} className="min-h-12 text-lime-ink">{t('retry')}</button>}</div>;
  const groups = groupFeed(all ? rows : rankFeed(rows).slice(0, 5));
  const firstAction = [...groups.urgent, ...groups.generate].find(item => item.kind === 'swap_requested' && typeof item.data.request_id === 'string')?.key;
  const expression = groups.urgent.length ? 'thinking' : 'welcome';
  return <div data-ko-feed className="space-y-card-gap border-b border-line p-card text-start">
    {captain && <KoDigest rows={rows} extras={extras ?? null} avatar={avatar('welcome')} />}
    {!rows.length && <div className="flex items-center gap-stack">{avatar('cheer')}<p className="text-sm text-muted">{t('empty')}</p></div>}
    {(['urgent', 'generate'] as const).map(group => groups[group].length > 0 && <section key={group} aria-label={t(group)} className="space-y-inline">
      <h2 className="flex items-center gap-inline text-sm font-bold">{avatar(expression)}{t(group)}</h2>
      {groups[group].map(item => <FeedCard key={item.key} item={item} primary={!captainWorkspaceEnabled() || item.key === firstAction} onDismiss={key => void dismiss(key)} />)}
    </section>)}
    {!all && rows.length > 5 && (captainWorkspaceEnabled() ? <Button variant="secondary" type="button" onClick={() => setAll(true)} className="min-h-12 w-full text-sm text-ink">{t('showAll')}</Button> : <button type="button" onClick={() => setAll(true)} className="min-h-12 w-full text-sm text-lime-ink">{t('showAll')}</button>)}
    {saveError && <p role="alert" className="text-sm text-danger">{t('saveError')}</p>}
  </div>;
}

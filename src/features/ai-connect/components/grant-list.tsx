'use client';
import { useLocale, useT } from '@/core/i18n/client';
import { formatTimestampAr } from '@/lib/dates';
import { Button, buttonClass } from '@/ui/button';
import type { OAuthGrant } from '@supabase/supabase-js';
import { messages } from '../messages';

export function GrantList({ grants, onRevoke, pending }: {
  grants: OAuthGrant[]; onRevoke: (id: string) => void; pending?: boolean;
}) {
  const t = useT(messages), locale = useLocale();
  if (!grants.length) return <p className="glass rounded-card p-card text-sm text-muted">{t('empty')}</p>;
  const available = ['Claude', 'ChatGPT'].filter(name => !grants.some(({ client }) =>
    client.name?.toLowerCase().includes(name.toLowerCase())));
  return <ul className="glass divide-y divide-line-soft rounded-card px-card">
    {grants.map(({ client, granted_at }) => {
      const name = client.name?.trim() || t('unknownClient');
      return <li key={client.id} className="flex items-center gap-stack py-stack">
        <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-control bg-surface-raised font-extrabold">{Array.from(name)[0]}</span>
        <div className="min-w-0 flex-1">
          <p className="wrap-anywhere font-bold"><bdi>{name}</bdi></p>
          <p className="text-sm text-muted">{t('connected')}</p>
          <time className="text-xs text-muted" dateTime={granted_at}>
            {formatTimestampAr(granted_at, { dateStyle: 'medium' }, locale)}
          </time>
        </div>
        <Button variant="secondary" block={false} disabled={pending} onClick={() => onRevoke(client.id)}>{t('disconnect')}</Button>
      </li>;
    })}
    {available.map(name => <li key={name} className="flex items-center gap-stack py-stack">
      <span aria-hidden className="grid size-12 shrink-0 place-items-center rounded-control bg-surface-raised font-extrabold">{name[0]}</span>
      <div className="min-w-0 flex-1">
        <p className="font-bold"><bdi>{name}</bdi></p>
        <p className="text-sm text-muted">{t('notConnected')}</p>
      </div>
      <a href="#mcp-connection-url" aria-label={t('connectTool', { name })}
        className={buttonClass({ variant: 'secondary', block: false, className: 'text-lime!' })}>{t('connect')}</a>
    </li>)}
  </ul>;
}

'use client';
import { useCallback, useTransition } from 'react';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { Button } from '@/ui/button';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { useToast } from '@/ui/toast';
import { loadConnectedTools, revokeConnectedTool } from '../data/actions';
import { messages } from '../messages';
import { GrantList } from './grant-list';

export function ConnectedTools({ userId, url }: { userId: string; url: string }) {
  const t = useT(messages), toast = useToast();
  const [pending, start] = useTransition();
  const load = useCallback(() => loadConnectedTools(), []);
  const resource = useResource(`settings:connected-tools:${userId}`, load);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t('copied'));
    } catch {
      toast.error(t('copyError'));
    }
  }

  return <div className="space-y-card-gap">
    {!resource.data ? resource.error
      ? <ErrorState message={t('loadError')} retryLabel={t('retry')} onRetry={() => void resource.retry()} />
      : <LoadingState variant="detail" />
      : <GrantList grants={resource.data.grants} pending={pending} onRevoke={id => start(async () => {
        const saved = await resource.mutate(current => ({
          count: current?.count ?? 0, grants: (current?.grants ?? []).filter(grant => grant.client.id !== id),
        }), async () => {
          if (!await revokeConnectedTool(id)) throw new Error('Revoke failed');
        });
        if (saved) toast.success({ title: t('disconnected'), detail: t('disconnectedDetail'), icon: 'check' });
        else toast.error(t('disconnectError'));
      })} />}
    <section id="mcp-connection-url" className="glass space-y-stack rounded-card p-card">
      <h3 className="text-title font-semibold">{t('link')}</h3>
      <p className="text-sm text-muted">{t('linkHint')}</p>
      <div className="flex items-center gap-inline">
        <code dir="ltr" className="min-w-0 flex-1 wrap-anywhere rounded-control bg-surface-raised p-stack text-start text-xs">{url}</code>
        <Button variant="secondary" block={false} onClick={() => void copy()}>{t('copy')}</Button>
      </div>
    </section>
    <section className="glass space-y-stack rounded-card p-card">
      <h3 className="text-title font-semibold">{t('canSee')}</h3>
      <p className="text-sm">{t('visible')}</p>
      <h3 className="text-title font-semibold">{t('neverSees')}</h3>
      <p className="text-sm text-muted">{t('hidden')}</p>
    </section>
    {resource.data && <section className="glass rounded-card p-card">
      <h3 className="text-title font-semibold">{t('usage')}</h3>
      <p className="text-sm text-muted">{t('usageCount', { count: resource.data.count })}</p>
    </section>}
  </div>;
}

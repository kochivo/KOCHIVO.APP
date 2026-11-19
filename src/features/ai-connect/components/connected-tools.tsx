'use client';
import { useCallback, useRef, useState, useTransition } from 'react';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { ErrorState } from '@/ui/error-state';
import { LoadingState } from '@/ui/loading-state';
import { useToast } from '@/ui/toast';
import { loadConnectedTools, revokeConnectedTool } from '../data/actions';
import { messages } from '../messages';
import { GrantList } from './grant-list';
import { ConnectionDialog } from './connection-dialog';
import type { ConnectionStep } from './connection-dialog';

export function ConnectedTools({ userId, url, player = false }: { userId: string; url: string; player?: boolean }) {
  const t = useT(messages), toast = useToast();
  const [pending, start] = useTransition();
  const [step, setStep] = useState<ConnectionStep | null>(null);
  const [failed, setFailed] = useState(false);
  const list = useRef<HTMLDivElement>(null);
  const focusList = useCallback(() => list.current?.querySelector('button')?.focus(), []);
  const load = useCallback(() => loadConnectedTools(), []);
  const resource = useResource(`settings:connected-tools:${userId}`, load);
  function disconnect(id: string) {
    setFailed(false);
    start(async () => {
      const saved = await resource.mutate(current => ({
        count: current?.count ?? 0, grants: (current?.grants ?? []).filter(grant => grant.client.id !== id),
      }), async () => {
        if (!await revokeConnectedTool(id)) throw new Error('Revoke failed');
      });
      if (saved) {
        setStep(null);
        toast.success({ title: t('disconnected'), detail: t('disconnectedDetail'), icon: 'check' });
      } else setFailed(true);
    });
  }

  return <div className="space-y-card-gap">
    {!resource.data ? resource.error
      ? <ErrorState message={t('loadError')} retryLabel={t('retry')} onRetry={() => void resource.retry()} />
      : <LoadingState variant="detail" />
      : <div ref={list}>
        <GrantList player={player} grants={resource.data.grants}
          onConnect={(name, opener) => setStep({ kind: 'connect', name, opener })}
          onDisconnect={(id, name, opener) => {
            setFailed(false);
            setStep({ kind: 'disconnect', id, name, opener });
          }} />
      </div>}
    <section className="glass space-y-stack rounded-card p-card">
      <h3 className="text-title font-semibold">{t('can')}</h3>
      <ul className="space-y-stack text-sm">
        {player ? <><li>{t('playerRead')}</li><li>{t('playerLog')}</li></> : <li>{t('visible')}</li>}
      </ul>
      {player && <p className="text-sm text-muted">{t('playerPhotos')}</p>}
      <h3 className="text-title font-semibold">{t('cannot')}</h3>
      <ul className="space-y-stack text-sm text-muted">
        {player ? <><li>{t('playerCannotEdit')}</li><li>{t('playerCannotSee')}</li></> : <>
          <li>{t('cannotChange')}</li><li>{t('hidden')}</li>
        </>}
      </ul>
    </section>
    {resource.data && <section className="glass rounded-card p-card">
      <h3 className="text-title font-semibold">{t('usage')}</h3>
      <p className="text-sm text-muted">{t(player ? 'playerUsageCount' : 'usageCount', { n: resource.data.count, count: resource.data.count }, resource.data.count)}</p>
    </section>}
    {step && <ConnectionDialog step={step} url={url} pending={pending} failed={failed}
      fallback={focusList} onClose={() => setStep(null)} onConfirm={disconnect} />}
  </div>;
}

'use client';

import { useCallback, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useResource } from '@/core/resource';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { listTemplatePlayers } from '../data/templates';
import { messages } from '../messages';

export function WorkspacePlayerPicker({ onClose }: { onClose: () => void }) {
  const t = useT(messages), router = useRouter(), dialog = useRef<HTMLDialogElement>(null);
  const loader = useCallback(async () => {
    const result = await listTemplatePlayers();
    if (result.error !== undefined) throw new Error(result.error);
    return result.data;
  }, []);
  const resource = useResource('templates:player-picker', loader);
  useEffect(() => { dialog.current?.showModal(); }, []);
  return <dialog ref={dialog} aria-labelledby="program-player-title" onCancel={onClose}
    className="sheet fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-card border border-line bg-surface p-section text-ink">
    <h2 id="program-player-title" className="mb-card-gap text-xl font-bold">{t('chooseAPlayer')}</h2>
    {resource.status === 'idle' || resource.status === 'loading' ? <LoadingState variant="list" /> : resource.error ? <div role="alert">
      <p>{t('couldntLoadPlayersTryAgain')}</p><Button variant="secondary" onClick={() => void resource.retry()}>{t('tryAgain')}</Button>
    </div> : resource.data?.length ? <ul className="grid gap-inline">
      {resource.data.map(player => <li key={player.playerId}><Button variant="secondary" className="min-h-12 w-full justify-start"
        onClick={() => router.push(`/captain/players/${player.playerId}/programs`)}>{player.fullName}</Button></li>)}
    </ul> : <p>{t('noPlayersYetAddAPlayerFirst')}</p>}
    <Button variant="secondary" className="mt-card-gap min-h-12" onClick={onClose}>{t('close')}</Button>
  </dialog>;
}

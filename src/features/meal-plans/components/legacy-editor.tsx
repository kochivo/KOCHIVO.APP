'use client';
import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { usePlanDraft } from '../hooks/use-plan-draft';
import { loadEditorContext } from '../data/editor-context';
import { messages } from './editor/messages';
import { messages as planMessages } from '../messages';
const PlayerEditor = dynamic(() => import('./editor/player-editor').then(module => module.PlayerEditor), { loading: () => <LoadingState variant="detail" /> });

export function LegacyEditor({ planId }: { planId: string }) {
  const t = useT(messages), planT = useT(planMessages);
  const state = usePlanDraft(planId, { editor: 'none' });
  const { draft } = state;
  const [context, setContext] = useState<Awaited<ReturnType<typeof loadEditorContext>> | null>(null);
  const [contextError, setContextError] = useState(false);
  const [retry, setRetry] = useState(0);
  const playerId = draft?.playerId;
  useEffect(() => {
    if (!playerId) return;
    let current = true;
    loadEditorContext(playerId).then(value => { if (current) { setContext(value); setContextError(false); } })
      .catch(() => { if (current) setContextError(true); });
    return () => { current = false; };
  }, [playerId, retry]);
  if (state.loading) return <LoadingState variant="detail" />;
  if (!draft) return <div role="alert">{state.error}<Button variant="secondary" onClick={state.reload}>{planT('tryAgain')}</Button></div>;
  if (playerId && !context) return contextError ? <div role="alert">{t('contextError')}<Button variant="secondary" onClick={() => setRetry(value => value + 1)}>{planT('tryAgain')}</Button></div> : <LoadingState variant="detail" />;
  return <PlayerEditor key={draft.id} data={{ context: context ?? { facts: {}, name: '', today: '', logs: [] }, draft, plans: [], fresh: false }} />;
}

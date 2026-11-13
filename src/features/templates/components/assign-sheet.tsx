'use client';

import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';
import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useEffect, useRef, useState } from 'react';
import { Users } from 'lucide-react';
import { Button } from '@/ui/button';
import { EmptyState } from '@/ui';
import { LoadingState } from '@/ui/loading-state';
import type { RosterPlayer } from '@/features/roster';
import { listTemplatePlayers } from '../data/templates';
import { useTemplateAssignment } from '../hooks/use-template-assignment';
import type { Template } from '../types';
import { starterText } from '@/lib/starter-text';

export function AssignSheet({ template, onClose }: { template: Template; onClose: () => void }) {
  const t = useT(messages);
  const locale = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const assignment = useTemplateAssignment(template, players.map(player => player.playerId), onClose);
  const { selected, done, failures, busy } = assignment;
  useEffect(() => { dialog.current?.showModal(); }, []);
  useEffect(() => {
    let current = true;
    listTemplatePlayers().then(result => {
      if (!current) return;
      if (result.error !== undefined) setLoadError(result.error);
      else { setPlayers(result.data); setLoadError(''); }
      setLoading(false);
    }).catch(() => {
      if (current) { setLoadError(t('couldntLoadPlayersTryAgain')); setLoading(false); }
    });
    return () => { current = false; };
  }, [attempt, t]);
  return <dialog ref={dialog} aria-labelledby="assign-template-title"
    onCancel={event => { if (busy) event.preventDefault(); else onClose(); }}
    className="sheet fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-card border border-line bg-surface p-6 text-ink">
    <div className="grid gap-4">
      <h2 id="assign-template-title" className="text-xl font-bold">{t('assignTitle', { title: starterText(template.title, locale) })}</h2>
      <p className="text-sm text-muted">{t('theyllGetASeparateCopyTheirActive')}</p>
      {loading ? <LoadingState variant="list" /> : loadError ? <div role="alert">{loadError}
        <Button variant={captainWorkspaceEnabled() ? 'secondary' : 'ghost'} className="min-h-12" onClick={() => { setLoading(true); setAttempt(value => value + 1); }}>{t('tryAgain')}</Button>
      </div> : players.length === 0 ? <EmptyState icon={Users} title={t('noPlayersYetAddAPlayerFirst')} body={t('chooseAPlayer')} action={{ label: t('openPlayers'), href: '/captain/players' }} /> :
        <fieldset disabled={busy} className="grid gap-2">
          <legend className="mb-2 text-sm text-muted">{t('chooseAPlayer')}</legend>
          <label className="flex min-h-12 items-center gap-3 px-4">
            <input type="checkbox" className="size-5 accent-lime" checked={assignment.allSelected} onChange={assignment.selectAll} />{t('selectAll')}
          </label>
          {players.map(player => <label key={player.playerId} className="glass flex min-h-12 cursor-pointer items-center gap-3 rounded-control px-4 py-3">
            <input type="checkbox" className="size-5 accent-lime" value={player.playerId} disabled={done.includes(player.playerId)} checked={selected.includes(player.playerId) || done.includes(player.playerId)}
              onChange={() => assignment.toggle(player.playerId)} />
            <span>{player.fullName}</span>
            {done.includes(player.playerId) && <span className="ms-auto text-sm text-muted">{t('assigned')}</span>}
          </label>)}
        </fieldset>}
      {Object.keys(failures).length > 0 && <div role="alert" className="text-danger">
        <p>{t('failedPlayers')}</p>
        <ul>{players.filter(player => failures[player.playerId]).map(player => <li key={player.playerId}>
          {player.fullName}: {failures[player.playerId]}
        </li>)}</ul>
        <Button variant="secondary" className="min-h-12" disabled={busy} onClick={() => void assignment.retry()}>{t('tryAgain')}</Button>
      </div>}
      {busy && <p role="status">{t('assigningTemplate')}</p>}
      <div className="flex flex-wrap gap-2">
        <Button variant={players.length ? 'primary' : 'secondary'} className="min-h-12" disabled={!selected.length || busy || loading || !!loadError} onClick={() => void assignment.assign()}>
          {t('assignMany', { n: selected.length })}
        </Button>
        <Button variant={captainWorkspaceEnabled() ? 'secondary' : 'ghost'} className="min-h-12" disabled={busy} onClick={onClose}>{t('cancel')}</Button>
      </div>
    </div>
  </dialog>;
}

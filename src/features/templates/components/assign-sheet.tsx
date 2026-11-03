'use client';

import { useLocale, useT } from '@/core/i18n/client';
import { messages } from '../messages';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/ui';
import { LoadingState } from '@/ui/loading-state';
import type { RosterPlayer } from '@/features/roster';
import { assignTemplate, listTemplatePlayers } from '../data/templates';
import type { Template } from '../types';
import { starterText } from '@/lib/starter-text';

export function AssignSheet({ template, onClose }: { template: Template; onClose: () => void }) {
  const t = useT(messages);
  const locale = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [players, setPlayers] = useState<RosterPlayer[]>([]);
  const [selected, setSelected] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [attempt, setAttempt] = useState(0);
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
  async function assign() {
    if (busy || !selected) return;
    setBusy(true); setError('');
    try {
      const result = await assignTemplate({ kind: template.kind, templateId: template.id, playerId: selected });
      if (result.error !== undefined) { setError(result.error); setBusy(false); return; }
      router.push(`/captain/${template.kind === 'program' ? 'programs' : 'nutrition'}/${result.data}`);
    } catch { setError(t('couldntAssignTemplateTryAgain')); setBusy(false); }
  }
  return <dialog ref={dialog} aria-labelledby="assign-template-title"
    onCancel={event => { if (busy) event.preventDefault(); else onClose(); }}
    className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-card border border-line bg-surface p-6 text-ink">
    <div className="grid gap-4">
      <h2 id="assign-template-title" className="text-xl font-bold">{t('assignTitle', { title: starterText(template.title, locale) })}</h2>
      <p className="text-sm text-muted">{t('theyllGetASeparateCopyTheirActive')}</p>
      {loading ? <LoadingState variant="list" /> : loadError ? <div role="alert">{loadError}
        <Button variant="ghost" className="min-h-12" onClick={() => { setLoading(true); setAttempt(value => value + 1); }}>{t('tryAgain')}</Button>
      </div> : players.length === 0 ? <p className="text-muted">{t('noPlayersYetAddAPlayerFirst')}</p> :
        <fieldset disabled={busy} className="grid gap-2">
          <legend className="mb-2 text-sm text-muted">{t('chooseAPlayer')}</legend>
          {players.map(player => <label key={player.playerId} className="glass flex min-h-12 cursor-pointer items-center gap-3 rounded-control px-4 py-3">
            <input type="radio" className="size-5 accent-lime" name="template-player" value={player.playerId} checked={selected === player.playerId}
              onChange={() => { setSelected(player.playerId); setError(''); }} />
            <span>{player.fullName}</span>
          </label>)}
        </fieldset>}
      {error && <p role="alert" className="text-danger">{error}</p>}
      {busy && <p role="status">{t('assigningTemplate')}</p>}
      <div className="flex flex-wrap gap-2">
        <Button className="min-h-12" disabled={!selected || busy || loading || !!loadError} onClick={() => void assign()}>
          {error ? t('tryAgain') : t('confirmAssignment')}
        </Button>
        <Button variant="ghost" className="min-h-12" disabled={busy} onClick={onClose}>{t('cancel')}</Button>
      </div>
    </div>
  </dialog>;
}

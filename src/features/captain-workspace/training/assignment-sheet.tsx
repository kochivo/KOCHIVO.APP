'use client';
import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { loadAssignmentPlayers, assignProgram } from './data/editor-actions';
import { messages } from './editor/messages';
import { messages as trainingMessages } from './messages';

export function AssignmentSheet({ programId, onClose }: { programId: string; onClose: () => void }) {
  const t = useT(messages), tt = useT(trainingMessages), router = useRouter();
  const load = useCallback(() => loadAssignmentPlayers(), []), players = useResource('training-assignment-players', load);
  const [selected, setSelected] = useState<string[]>([]), [done, setDone] = useState<string[]>([]);
  const [busy, setBusy] = useState(false), [failures, setFailures] = useState<Record<string, string>>({});
  async function assign() {
    if (busy) return; setBusy(true);
    const next: Record<string, string> = {};
    for (const id of selected.filter(id => !done.includes(id))) {
      try { const result = await assignProgram(programId, id); if (result.error !== undefined) next[id] = result.error;
        else setDone(current => [...current, id]);
      } catch { next[id] = tt('error'); }
    }
    setFailures(next); setBusy(false); router.refresh();
    if (!Object.keys(next).length) onClose();
  }
  return <ResponsiveDialog modal openerId="assign-program" fallbackId="assign-program" aria-label={t('assignTitle')} onDismiss={() => { if (!busy) onClose(); }} className="sheet fixed inset-0 z-50 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-md space-y-3 overflow-y-auto rounded-card p-5 text-ink backdrop:bg-bg-deep/80">
    <h2 className="font-display text-[19px]">{t('assignTitle')}</h2>
    {players.error ? <p role="alert">{tt('error')}<button className="min-h-12 px-3" onClick={() => void players.retry()}>{tt('retry')}</button></p> : !players.data ? <p role="status">{tt('loading')}</p> : players.data.length ?
      <fieldset disabled={busy}>{players.data.map(player => <label key={player.playerId} className="flex min-h-12 items-center gap-3 border-t border-line-soft"><input type="checkbox" disabled={done.includes(player.playerId)} checked={selected.includes(player.playerId)} className="size-5 accent-lime" onChange={event => setSelected(current => event.target.checked ? [...current, player.playerId] : current.filter(id => id !== player.playerId))} />{player.fullName}{failures[player.playerId] && <span role="alert" className="text-xs text-danger">{failures[player.playerId]}</span>}</label>)}</fieldset> : <p className="text-faint">{t('playersEmpty')}</p>}
    {busy && <p role="status">{tt('loading')}</p>}
    <button disabled={busy || !selected.some(id => !done.includes(id))} className="min-h-12 rounded-full border border-line px-4 disabled:opacity-40" onClick={() => void assign()}>{t('assign')}</button>
    <button disabled={busy} className="min-h-12 px-3" onClick={onClose}>{t('close')}</button>
  </ResponsiveDialog>;
}

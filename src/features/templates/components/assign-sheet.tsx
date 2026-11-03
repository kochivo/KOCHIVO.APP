'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/ui';
import type { RosterPlayer } from '@/features/roster';
import { assignTemplate, listTemplatePlayers } from '../data/templates';
import type { Template } from '../types';

export function AssignSheet({ template, onClose }: { template: Template; onClose: () => void }) {
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
      if (current) { setLoadError('اللاعبين متحملوش. جرّب تاني'); setLoading(false); }
    });
    return () => { current = false; };
  }, [attempt]);
  async function assign() {
    if (busy || !selected) return;
    setBusy(true); setError('');
    try {
      const result = await assignTemplate({ kind: template.kind, templateId: template.id, playerId: selected });
      if (result.error !== undefined) { setError(result.error); setBusy(false); return; }
      router.push(`/captain/${template.kind === 'program' ? 'programs' : 'nutrition'}/${result.data}`);
    } catch { setError('القالب متعيّنش. جرّب تاني'); setBusy(false); }
  }
  return <dialog ref={dialog} dir="rtl" aria-labelledby="assign-template-title"
    onCancel={event => { if (busy) event.preventDefault(); else onClose(); }}
    className="fixed inset-0 m-auto max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg overflow-y-auto rounded-card border border-line bg-surface p-6 text-ink">
    <div className="grid gap-4">
      <h2 id="assign-template-title" className="text-xl font-bold">ادّي «{template.title}» للاعب</h2>
      <p className="text-sm text-muted">هياخد نسخة مستقلة، والنظام النشط عنده هيتأرشف</p>
      {loading ? <p role="status">جاري تحميل اللاعبين</p> : loadError ? <div role="alert">{loadError}
        <Button variant="ghost" className="min-h-12" onClick={() => { setLoading(true); setAttempt(value => value + 1); }}>جرّب تاني</Button>
      </div> : players.length === 0 ? <p className="text-muted">لسه مفيش لاعبين. ضيف لاعب الأول</p> :
        <fieldset disabled={busy} className="grid gap-2">
          <legend className="mb-2 text-sm text-muted">اختار اللاعب</legend>
          {players.map(player => <label key={player.playerId} className="glass flex min-h-12 cursor-pointer items-center gap-3 rounded-control px-4 py-3">
            <input type="radio" className="size-5 accent-lime" name="template-player" value={player.playerId} checked={selected === player.playerId}
              onChange={() => { setSelected(player.playerId); setError(''); }} />
            <span>{player.fullName}</span>
          </label>)}
        </fieldset>}
      {error && <p role="alert" className="text-danger">{error}</p>}
      {busy && <p role="status">جاري تعيين القالب</p>}
      <div className="flex flex-wrap gap-2">
        <Button className="min-h-12" disabled={!selected || busy || loading || !!loadError} onClick={() => void assign()}>
          {error ? 'جرّب تاني' : 'أكّد التعيين'}
        </Button>
        <Button variant="ghost" className="min-h-12" disabled={busy} onClick={onClose}>إلغاء</Button>
      </div>
    </div>
  </dialog>;
}

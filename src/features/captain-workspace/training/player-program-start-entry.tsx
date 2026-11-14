'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { startTraining } from '@/features/programs';
import { StartChoice } from './start-choice';
import { messages } from './player-program-messages';

export function PlayerProgramStartEntry({ playerId, templatesInitially, onClose }: {
  playerId: string; templatesInitially: boolean; onClose: () => void;
}) {
  const t = useT(messages), router = useRouter();
  const [templates, setTemplates] = useState(templatesInitially), [busy, setBusy] = useState(false), [error, setError] = useState('');
  async function start(templateId?: string) {
    if (busy) return;
    setBusy(true); setError('');
    try {
      const result = await startTraining(playerId, templateId);
      if (!result.data) { setError(result.error); return; }
      router.push(`/captain/programs/${result.data.id}`);
      onClose();
    } catch { setError(t('error')); }
    finally { setBusy(false); }
  }
  return <ResponsiveDialog modal openerId="player-program-change" fallbackId="player-program-change" aria-label={t('change')}
    onDismiss={() => { if (!busy) onClose(); }} className="sheet fixed inset-0 z-50 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl space-y-3 overflow-y-auto rounded-card p-5 text-ink backdrop:bg-bg-deep/80">
    <h2 className="font-semibold">{t(templatesInitially ? 'change' : 'assign')}</h2>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {busy && <p role="status" className="text-sm text-muted">{t('loading')}</p>}
    <StartChoice templates={templates} onTemplates={() => setTemplates(!templates)} onStart={id => void start(id)} busy={busy} />
    <button disabled={busy} onClick={onClose} className="glass min-h-12 rounded-control px-4 text-sm disabled:opacity-40">{t('close')}</button>
  </ResponsiveDialog>;
}

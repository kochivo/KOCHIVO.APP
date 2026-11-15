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
  const [selected, setSelected] = useState<string | null>(null);
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
  const close = () => { if (!busy) onClose(); };
  return <ResponsiveDialog modal openerId="player-program-change" fallbackId="player-program-change"
    title={t(templatesInitially ? 'change' : 'assign')} onClose={close} onDismiss={close}
    className="sheet fixed inset-0 z-50 m-auto max-h-[90dvh] w-[calc(100%-2rem)] max-w-2xl rounded-card text-ink backdrop:bg-bg-deep/80"
    footer={<button disabled={busy || selected === null} onClick={() => void start(selected || undefined)}
      className="press min-h-12 w-full cursor-pointer rounded-control bg-lime px-4 text-sm font-semibold text-on-lime focus-visible:ring-2 focus-visible:ring-lime disabled:opacity-40">{t(templatesInitially ? 'change' : 'assign')}</button>}>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
    {busy && <p role="status" className="text-sm text-muted">{t('loading')}</p>}
    <StartChoice templates={templates} onTemplates={() => setTemplates(!templates)} onStart={id => setSelected(id ?? '')} selectedId={selected} busy={busy} />
  </ResponsiveDialog>;
}

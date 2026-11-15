'use client';
import { useId, useRef, useState } from 'react';
import { useT } from '@/core/i18n/client';
import type { PainReportRow } from '@/core/offline/pain-tables';
import { Button } from '@/ui/button';
import { KoSend } from '@/ui/icons/ko-send';
import { ResponsiveDialog } from '@/ui/responsive-dialog';
import { messages } from '../pain/messages';
import { PainBodyMap } from './pain-body-map';

export type PainInput = Pick<PainReportRow, 'area' | 'severity' | 'side_view' | 'kind'>;
export function PainSheet({ onClose, onSend, exercise }: { onClose: () => void; onSend: (input: PainInput) => Promise<void>; exercise: string }) {
  const t = useT(messages);
  const id = useId();
  const saving = useRef(false);
  const [area, setArea] = useState<PainInput['area'] | null>(null);
  const [side_view, setView] = useState<PainInput['side_view']>('front');
  const [severity, setSeverity] = useState<number | null>(null);
  const [kind, setKind] = useState<PainInput['kind'] | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function send() {
    if (!area || !severity || !kind || saving.current) return;
    saving.current = true; setBusy(true); setError(false);
    try { await onSend({ area, side_view, severity, kind }); }
    catch { setError(true); }
    finally { saving.current = false; setBusy(false); }
  }
  return <ResponsiveDialog modal title={t('where')} fallbackId="pain-button" onDismiss={() => { if (!busy) onClose(); }}
    className="sheet fixed inset-x-0 bottom-0 m-auto max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-card p-card text-ink"
    footer={<Button block disabled={busy || !area || !severity || !kind} onClick={() => void send()}><KoSend aria-hidden className="size-5" />{t(busy ? 'saving' : 'send')}</Button>}>
    <div className="space-y-card-gap">
      <p className="text-muted">{exercise}</p>
      {(severity === 5 || kind === 'sharp') && <p role="alert" className="rounded-control bg-danger-soft p-stack text-danger">{t('doctor')}</p>}
      <div role="group" aria-label={t('where')} className="flex gap-inline">
        {(['front', 'back'] as const).map(view => <Button key={view} variant="secondary" aria-pressed={view === side_view} onClick={() => setView(view)}>{t(view)}</Button>)}
      </div>
      <PainBodyMap area={area} view={side_view} onChange={setArea} />
      <fieldset className="space-y-stack"><legend id={id}>{t('severity')}</legend>
        <div className="grid grid-cols-5 gap-inline">{[1, 2, 3, 4, 5].map(value => <Button key={value} variant="secondary" aria-pressed={value === severity}
          onClick={() => setSeverity(value)} className="min-h-12 px-0">{value}</Button>)}</div>
      </fieldset>
      <fieldset className="space-y-stack"><legend>{t('kind')}</legend><div className="flex flex-wrap gap-inline">
        {(['sharp', 'strain', 'tired'] as const).map(value => <Button key={value} variant="secondary" aria-pressed={value === kind} onClick={() => setKind(value)}>{t(value)}</Button>)}
      </div></fieldset>
      {error && <p role="alert" className="text-danger">{t('error')}</p>}
    </div>
  </ResponsiveDialog>;
}

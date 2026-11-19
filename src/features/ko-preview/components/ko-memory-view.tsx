import { useEffect, useState } from 'react';
import { Trash2 } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { IconButton } from '@/ui/icon-button';
import { useKoMemory } from '../hooks/use-ko-memory';
import { messages } from '../messages';

export function KoMemoryView({ onCount }: { onCount: (count: number | null) => void }) {
  const t = useT(messages);
  const { state, error, busy, reload, mutate } = useKoMemory();
  const [confirm, setConfirm] = useState(false);
  const count = state?.memories.length ?? null;
  useEffect(() => { onCount(count); }, [count, onCount]);

  return <div className="flex min-h-0 flex-1 flex-col gap-stack overflow-y-auto overscroll-contain p-card text-base">
    {error && <div role="alert" className="text-sm text-danger">{t('memoryError')} <Button type="button" variant="ghost" onClick={reload}>{t('memoryRetry')}</Button></div>}
    {!state && !error && <p role="status" className="text-sm text-muted">{t('memoryLoading')}</p>}
    {state && <>
      <div className="flex items-center gap-stack rounded-card border border-line p-stack">
        <div className="flex-1"><p className="font-bold">{t('memorySwitch')}</p><p className="text-xs text-muted">{t('memoryHint')}</p></div>
        <Button type="button" variant="ghost" role="switch" aria-label={t('memorySwitch')} aria-checked={state.learning} disabled={busy}
          className="min-w-12 px-0!" onClick={() => void mutate({ ...state, learning: !state.learning }, { operation: 'learning', learning: !state.learning })}>
          <span className={`relative h-7 w-12 rounded-full ${state.learning ? 'bg-lime' : 'bg-line'}`}>
            <span className={`absolute top-1 size-5 rounded-full ${state.learning ? 'start-1 bg-bg-deep' : 'end-1 bg-muted'}`} />
          </span>
        </Button>
      </div>
      {state.memories.length === 0 ? <p className="text-sm text-muted">{t('memoryEmpty')}</p> : <>
        <ul className="divide-y divide-line rounded-card border border-line">
          {state.memories.map(memory => <li className="flex items-center gap-stack ps-stack" key={memory.id}>
            <span dir="auto" className="min-w-0 flex-1 break-words py-inline">{memory.text}</span>
            <IconButton type="button" aria-label={t('memoryDelete')} disabled={busy}
              className="size-12 shrink-0 text-muted" onClick={() => void mutate({
                ...state, memories: state.memories.filter(item => item.id !== memory.id),
              }, { operation: 'delete', id: memory.id })}><Trash2 aria-hidden className="size-5" /></IconButton>
          </li>)}
        </ul>
        {confirm ? <div className="flex flex-wrap items-center gap-inline rounded-card border border-line p-stack">
          <p className="w-full text-sm">{t('memoryConfirmAll')}</p>
          <Button type="button" variant="ghost" className="text-danger" disabled={busy} onClick={() => {
            setConfirm(false);
            void mutate({ ...state, memories: [] }, { operation: 'deleteAll' });
          }}>{t('memoryDelete')}</Button>
          <Button type="button" variant="ghost" onClick={() => setConfirm(false)}>{t('confirmCancel')}</Button>
        </div> : <Button type="button" variant="ghost" disabled={busy} className="text-sm text-muted underline"
          onClick={() => setConfirm(true)}>{t('memoryDeleteAll')}</Button>}
      </>}
    </>}
  </div>;
}

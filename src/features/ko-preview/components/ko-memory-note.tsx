import { useState } from 'react';
import { Bookmark } from 'lucide-react';
import { Button } from '@/ui/button';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { koLearning } from '../data/learning';
import type { Memory } from '../data/learning';

export function KoMemoryNote({ memory, onUndo }: { memory?: Memory; onUndo?: () => void }) {
  const t = useT(messages);
  const [state, setState] = useState<'saved' | 'pending' | 'deleted' | 'error'>('saved');
  async function undo() {
    if (!memory) return;
    setState('pending');
    try {
      await koLearning({ operation: 'delete', id: memory.id });
      setState('deleted');
      onUndo?.();
    } catch {
      setState('error');
    }
  }
  const removed = !memory || state === 'deleted' || state === 'pending';
  return <div className="rounded-2xl border border-dashed border-line px-stack text-sm">
    <div className="flex items-center gap-inline">
      <Bookmark aria-hidden className="size-4 shrink-0 text-muted" />
      <span className="flex-1 py-inline" aria-live="polite">{removed ? t('memoryRemoved') : t('memorySaved', { text: memory.text })}</span>
      {!removed && <Button type="button" variant="ghost" onClick={() => void undo()} className="text-xs text-muted underline">{t('memoryUndo')}</Button>}
    </div>
    {state === 'error' && <p className="pb-inline text-xs text-danger" role="alert">{t('memoryError')}</p>}
  </div>;
}

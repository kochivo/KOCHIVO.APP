'use client';

import { clickableClass, Button } from '@/ui/button';
import { useCallback } from 'react';
import { Copy, PencilLine } from 'lucide-react';
import { DisclosureChevron } from '@/ui/disclosure-chevron';
import { RowChevron } from '@/ui/row-chevron';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { trainingTemplates } from '@/features/programs';
import { messages } from './messages';

export function StartChoice({ templates, onTemplates, onStart, busy, selectedId }: {
  templates: boolean; onTemplates: () => void; onStart: (templateId?: string) => void; busy: boolean;
  selectedId?: string | null;
}) {
  const t = useT(messages);
  const selection = selectedId !== undefined;
  const selectable = selection ? 'press min-h-12 cursor-pointer focus-visible:ring-2 focus-visible:ring-lime aria-pressed:border-lime' : '';
  const load = useCallback(async () => {
    const result = await trainingTemplates();
    if (!result.data) throw new Error(result.error);
    return result.data;
  }, []);
  const list = useResource(templates ? 'training-templates' : null, load);
  return <div className="space-y-stack">
    <div className="grid gap-stack min-[761px]:grid-cols-2">
      <button disabled={busy} aria-pressed={selection ? selectedId === '' : undefined} className={`${clickableClass} glass rounded-card border border-line-soft p-card text-start disabled:opacity-40 ${selectable}`} onClick={() => onStart()}>
        <PencilLine aria-hidden className="size-6 text-lime" /><h2 className="mb-inline mt-inline font-display text-title font-semibold">{t('scratch')}</h2>
        <p className="text-xs text-muted">{t('scratchBody')}</p>
      </button>
      <button disabled={busy} aria-expanded={templates} className={`${clickableClass} glass rounded-card border border-line-soft p-card text-start disabled:opacity-40 ${selectable}`} onClick={onTemplates}>
        <Copy aria-hidden className="size-6 text-lime" /><h2 className="mb-inline mt-inline font-display text-title font-semibold">{t('template')}</h2>
        <p className="text-xs text-muted">{t('templateBody')}</p>
        <DisclosureChevron expanded={templates} className="ms-auto" />
      </button>
    </div>
    {templates && <div className="glass rounded-card border border-line-soft p-card">
      {list.error ? <p role="alert">{t('error')}<Button type="submit" variant={'secondary'} block={false} className={"min-h-12 px-stack"} onClick={() => void list.retry()}>{t('retry')}</Button></p> :
        !list.data ? <p role="status" className="text-faint">{t('loading')}</p> :
          list.data.length ? list.data.map(row => <button disabled={busy} aria-pressed={selection ? selectedId === row.id : undefined} className={`${clickableClass} my-inline flex min-h-12 w-full items-center rounded-control border border-line-soft px-stack text-start ${selection ? `${selectable} gap-stack hover:bg-surface-raised` : ''}`} key={row.id} onClick={() => onStart(row.id)}><span className="min-w-0 flex-1">{row.title}</span><RowChevron /></button>) : <p className="text-faint">{t('noTemplates')}</p>}
    </div>}
  </div>;
}

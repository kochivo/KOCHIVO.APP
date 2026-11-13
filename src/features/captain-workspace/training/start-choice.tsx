'use client';

import { useCallback } from 'react';
import { Copy, PencilLine } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { useResource } from '@/core/resource';
import { trainingTemplates } from '@/features/programs';
import { messages } from './messages';

export function StartChoice({ templates, onTemplates, onStart, busy }: {
  templates: boolean; onTemplates: () => void; onStart: (templateId?: string) => void; busy: boolean;
}) {
  const t = useT(messages);
  const load = useCallback(async () => {
    const result = await trainingTemplates();
    if (!result.data) throw new Error(result.error);
    return result.data;
  }, []);
  const list = useResource(templates ? 'training-templates' : null, load);
  return <div className="space-y-3">
    <div className="grid gap-3 min-[761px]:grid-cols-2">
      <button disabled={busy} className="glass rounded-card border border-line-soft p-5 text-start disabled:opacity-40" onClick={() => onStart()}>
        <PencilLine aria-hidden className="size-6 text-lime" /><h2 className="mb-1 mt-2 font-display text-[19px] font-semibold">{t('scratch')}</h2>
        <p className="text-[12.5px] text-muted">{t('scratchBody')}</p>
      </button>
      <button disabled={busy} aria-expanded={templates} className="glass rounded-card border border-line-soft p-5 text-start disabled:opacity-40" onClick={onTemplates}>
        <Copy aria-hidden className="size-6 text-lime" /><h2 className="mb-1 mt-2 font-display text-[19px] font-semibold">{t('template')}</h2>
        <p className="text-[12.5px] text-muted">{t('templateBody')}</p>
      </button>
    </div>
    {templates && <div className="glass rounded-card border border-line-soft p-5">
      {list.error ? <p role="alert">{t('error')}<button className="min-h-12 rounded-full border border-line px-3" onClick={() => void list.retry()}>{t('retry')}</button></p> :
        !list.data ? <p role="status" className="text-faint">{t('loading')}</p> :
          list.data.length ? list.data.map(row => <button disabled={busy} className="my-2 flex min-h-12 w-full items-center rounded-control border border-line-soft px-3 text-start" key={row.id} onClick={() => onStart(row.id)}>{row.title}</button>) : <p className="text-faint">{t('noTemplates')}</p>}
    </div>}
  </div>;
}

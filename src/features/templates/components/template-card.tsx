'use client';

import Link from 'next/link';
import { Copy, Eye, Pencil, Trash2 } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { starterText } from '@/lib/starter-text';
import { Button } from '@/ui';
import { messages } from '../messages';
import type { Template } from '../types';

export function TemplateCard({ template, busy, error, onPreview, onAssign, onCopy, onRename, onDelete }: {
  template: Template; busy: boolean; error?: string;
  onPreview: () => void; onAssign: () => void; onCopy: () => void;
  onRename: (title: string) => void; onDelete: () => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  return <li className="glass flex flex-col gap-card-gap rounded-card p-card">
    <div className="flex items-start justify-between gap-stack">
      <div className="min-w-0 space-y-inline">
        <h3 className="break-words text-xl font-bold">{starterText(template.title, locale)}</h3>
        {template.starter && <p className="w-fit rounded-full bg-lime-soft px-stack py-inline text-xs font-bold text-lime">{t('starterBadge')}</p>}
      </div>
      <span className="glass-strong shrink-0 rounded-control px-stack py-inline text-sm">{t(template.kind === 'program' ? 'dayCount' : 'mealCount', { n: template.count, count: formatNumber(template.count, locale) })}</span>
    </div>
    <div className="mt-auto flex flex-wrap items-center gap-inline">
      <Button variant="ghost" className="min-h-12" disabled={busy} onClick={onPreview}><Eye aria-hidden className="size-5" />{t('preview')}</Button>
      <Button variant="secondary" className="min-h-12 flex-1" disabled={busy} onClick={onAssign}>{t('assignToPlayer')}</Button>
      <Button variant="ghost" className="min-h-12" disabled={busy} onClick={onCopy}><Copy aria-hidden className="size-5" />{t('copy')}</Button>
      {!template.starter && <>
        {!busy && <Link className="inline-flex min-h-12 items-center px-stack" href={`/captain/${template.kind === 'program' ? 'programs' : 'nutrition'}/${template.id}`}>{t('editTemplate')}</Link>}
        <Button variant="ghost" className="min-h-12 min-w-12" aria-label={t('rename', { v0: template.title })} disabled={busy} onClick={() => {
          const title = window.prompt(t('newTemplateName'), template.title);
          if (title !== null) onRename(title.trim());
        }}><Pencil aria-hidden className="size-5" /></Button>
        <Button variant="ghost" className="min-h-12 min-w-12" aria-label={t('delete', { v0: template.title })} disabled={busy} onClick={() => {
          if (window.confirm(t('deleteTemplatePlayerCopiesWillStayUnchanged', { v0: template.title }))) onDelete();
        }}><Trash2 aria-hidden className="size-5" /></Button>
      </>}
    </div>
    {error && <p role="alert" className="text-sm text-danger">{error}</p>}
  </li>;
}

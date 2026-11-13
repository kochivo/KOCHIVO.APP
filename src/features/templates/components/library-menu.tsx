'use client';

import { Button } from '@/ui/button';
import { Ellipsis } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { messages } from '../messages';
import { messages as libraryMessages } from '../library-messages';
import type { LibraryTemplate } from '../library-types';

export function LibraryMenu({ template, busy, onPreview, onAssign, onCopy, onRename, onDelete, onArchive }: {
  template: LibraryTemplate; busy: boolean; onPreview: () => void; onAssign: () => void; onCopy: () => void;
  onRename: (title: string) => void; onDelete: () => void; onArchive: () => void;
}) {
  const t = useT(messages), lt = useT(libraryMessages);
  return <details className="relative">
    <summary aria-label={lt('more')} className="flex min-h-12 min-w-12 cursor-pointer list-none items-center justify-center rounded-full border border-line-soft"><Ellipsis aria-hidden className="size-4" /></summary>
    <div className="glass-strong absolute end-0 top-full z-10 grid min-w-48 rounded-card border border-line p-2 shadow-xl">
      <Button variant="secondary" disabled={busy} className="min-h-12 px-3 text-start" onClick={onPreview}>{t('preview')}</Button>
      <Button variant="secondary" disabled={busy} className="min-h-12 px-3 text-start" onClick={onAssign}>{t('assignToPlayer')}</Button>
      <Button variant="secondary" disabled={busy} className="min-h-12 px-3 text-start" onClick={onCopy}>{t('copy')}</Button>
      {!template.starter && <>
        <Button variant="secondary" disabled={busy} className="min-h-12 px-3 text-start" onClick={() => {
          const title = window.prompt(t('newTemplateName'), template.title);
          if (title !== null) onRename(title.trim());
        }}>{t('rename', { v0: template.title })}</Button>
        <Button variant="secondary" disabled={busy} className={template.archived ? 'min-h-12 px-3 text-start' : 'min-h-12 border border-danger/40 px-3 text-start text-danger!'} onClick={onArchive}>{lt(template.archived ? 'restore' : 'archive')}</Button>
        <Button variant="secondary" disabled={busy} className="min-h-12 border border-danger/40 px-3 text-start text-danger!" onClick={() => {
          if (window.confirm(t('deleteTemplatePlayerCopiesWillStayUnchanged', { v0: template.title }))) onDelete();
        }}>{t('delete', { v0: template.title })}</Button>
      </>}
    </div>
  </details>;
}

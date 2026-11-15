'use client';

import { Files } from 'lucide-react';
import { useLocale, useT } from '@/core/i18n/client';
import { formatNumber } from '@/lib/format';
import { Button, EmptyState } from '@/ui';
import { LoadingState } from '@/ui/loading-state';
import { messages } from '../messages';
import type { Template } from '../types';
import { TemplateCard } from './template-card';

export function TemplateSection({ starter, templates, loading, error, busy, errors, creating, onRetry, onCreate, onPreview, onAssign, onCopy, onRename, onDelete }: {
  starter: boolean; templates: Template[]; loading: boolean; error: string;
  busy: string[]; errors: Record<string, string>; creating: boolean;
  onRetry: () => void; onCreate: () => void; onPreview: (template: Template) => void;
  onAssign: (template: Template) => void; onCopy: (template: Template) => void;
  onRename: (template: Template, title: string) => void; onDelete: (template: Template) => void;
}) {
  const t = useT(messages);
  const locale = useLocale();
  const id = starter ? 'kochivo-templates' : 'my-templates';
  return <section id={id} aria-labelledby={`${id}-heading`} className="grid scroll-mt-6 gap-card-gap">
    <header className="flex flex-wrap items-center justify-between gap-stack">
      <h2 id={`${id}-heading`} className="flex items-baseline gap-stack text-2xl font-bold"><bdi>{t(starter ? 'kochivoTemplates' : 'myTemplates')}</bdi>
        <bdi className="text-muted">{formatNumber(templates.length, locale)}</bdi>
      </h2>
      {!starter && <Button className="min-h-12" disabled={creating || loading || !!error} onClick={onCreate}>{t('newTemplate')}</Button>}
    </header>
    {loading ? <LoadingState variant="cards" /> : error ? <div role="alert" className="glass rounded-card p-card">{error}
      <Button variant="ghost" className="min-h-12" onClick={onRetry}>{t('tryAgain')}</Button>
    </div> : templates.length === 0 ? <div className="grid gap-inline">
      <EmptyState icon={Files} title={t(starter ? 'emptyStarters' : 'emptyTitle')} body={t(starter ? 'nothingHereYet' : 'emptyBody')} />
      {!starter && <a className="inline-flex min-h-12 items-center justify-center rounded-control px-page-x text-muted" href="#kochivo-templates">{t('copyStarter')}</a>}
    </div> : <ul className="grid gap-card-gap sm:grid-cols-2">
      {templates.map(template => {
        const key = `${template.kind}-${template.id}`;
        return <TemplateCard key={key} template={template} busy={busy.includes(key)} error={errors[key]}
          onPreview={() => onPreview(template)} onAssign={() => onAssign(template)} onCopy={() => onCopy(template)}
          onRename={title => onRename(template, title)} onDelete={() => onDelete(template)} />;
      })}
    </ul>}
  </section>;
}

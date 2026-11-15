'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Copy, Eye, Pencil } from 'lucide-react';
import { secondaryButtonClass } from '@/ui/secondary-button-class';
import { useT } from '@/core/i18n/client';
import { Button, buttonClass } from '@/ui/button';
import { messages } from '../messages';
import type { SettingsProfile } from '../schema';
import { WorkspaceAvatar } from './workspace-avatar';
import { WorkspaceFact } from './workspace-fact';

export function WorkspacePageCard({ profile, edit }: { profile: SettingsProfile; edit: () => void }) {
  const t = useT(messages);
  const [status, setStatus] = useState('');
  const slug = profile.public_slug;
  return <section className="glass rounded-card border border-line-soft p-card">
    <header className="mb-stack flex items-center justify-between gap-stack">
      <h2 className="text-sm font-semibold">{t('workspacePage')}</h2>
      {slug && <Link href={`/c/${slug}`} target="_blank" rel="noreferrer" className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center gap-inline px-page-x text-sm" })}>
        <Eye aria-hidden className="size-4" />{t('workspaceView')}</Link>}
    </header>
    <div className="flex min-w-0 items-center gap-card-gap border-b border-line-soft pb-card">
      <WorkspaceAvatar profile={profile} />
      <div className="min-w-0 flex-1"><b className="text-row font-semibold">{t('workspaceCaptain', { name: profile.full_name })}</b>
        <p dir="ltr" className="break-all text-start text-xs text-muted">{slug ? t('publicPreview', { slug }) : t('publicSlug')}</p></div>
      {slug && <Button variant="secondary" className="shrink-0 rounded-full" onClick={async () => {
        try { await navigator.clipboard.writeText(`https://kochivo.site/c/${slug}`); setStatus(t('copied')); }
        catch { setStatus(t('copyFailed')); }
      }}><Copy aria-hidden className="size-4" />{t('workspaceCopy')}</Button>}
    </div>
    <WorkspaceFact label={t('workspaceBio')}><button type="button" onClick={edit} className={secondaryButtonClass + ' text-start'}>{profile.bio || t('workspaceUnset')}<Pencil aria-hidden className="size-4 shrink-0" /></button></WorkspaceFact>
    {status && <p role="status" className="mt-inline text-sm text-muted">{status}</p>}
  </section>;
}

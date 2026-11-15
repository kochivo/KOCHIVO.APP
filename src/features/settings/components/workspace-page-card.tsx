'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Copy, Eye } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { messages } from '../messages';
import type { SettingsProfile } from '../schema';
import { WorkspaceAvatar } from './workspace-avatar';
import { WorkspaceFact } from './workspace-fact';
import { buttonClass } from '@/ui/button';

export function WorkspacePageCard({ profile, edit }: { profile: SettingsProfile; edit: () => void }) {
  const t = useT(messages);
  const [status, setStatus] = useState('');
  const slug = profile.public_slug;
  return <section className="glass rounded-card border border-line-soft p-3.5">
    <header className="mb-3 flex items-center justify-between gap-3">
      <h2 className="text-sm font-semibold">{t('workspacePage')}</h2>
      {slug && <Link href={`/c/${slug}`} target="_blank" rel="noreferrer" className={buttonClass({ variant: 'secondary', block: false, className: "inline-flex min-h-12 items-center gap-2 px-4 text-sm" })}>
        <Eye aria-hidden className="size-4" />{t('workspaceView')}</Link>}
    </header>
    <div className="flex min-w-0 items-center gap-4 border-b border-line-soft pb-4">
      <WorkspaceAvatar profile={profile} />
      <div className="min-w-0 flex-1"><b className="text-[13px] font-semibold">{t('workspaceCaptain', { name: profile.full_name })}</b>
        <p dir="ltr" className="break-all text-start text-xs text-muted">{slug ? t('publicPreview', { slug }) : t('publicSlug')}</p></div>
      {slug && <Button variant="secondary" className="shrink-0 rounded-full" onClick={async () => {
        try { await navigator.clipboard.writeText(`https://kochivo.site/c/${slug}`); setStatus(t('copied')); }
        catch { setStatus(t('copyFailed')); }
      }}><Copy aria-hidden className="size-4" />{t('workspaceCopy')}</Button>}
    </div>
    <WorkspaceFact label={t('workspaceBio')}><button type="button" onClick={edit} className="min-h-12 text-start">{profile.bio || t('workspaceUnset')}</button></WorkspaceFact>
    {status && <p role="status" className="mt-2 text-sm text-muted">{status}</p>}
  </section>;
}

'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Copy, Eye } from 'lucide-react';
import { useT } from '@/core/i18n/client';
import { Button, buttonClass } from '@/ui/button';
import { messages } from '../messages';
import { messages as publicMessages } from '../public-page/messages';

export function WorkspacePageCard({ slug }: { slug: string | null | undefined }) {
  const t = useT(messages), publicT = useT(publicMessages);
  const [status, setStatus] = useState('');
  if (!slug) return <p className="text-sm text-muted">{publicT('noSlug')}</p>;
  return <div className="space-y-inline">
    <div className="flex flex-wrap items-center gap-stack rounded-control border border-line-soft p-stack">
      <p dir="ltr" className="min-w-0 flex-1 break-all text-start text-sm text-muted">{t('publicPreview', { slug })}</p>
      <Button variant="secondary" onClick={async () => {
        try { await navigator.clipboard.writeText(`https://kochivo.site/c/${slug}`); setStatus(t('copied')); }
        catch { setStatus(t('copyFailed')); }
      }}><Copy aria-hidden className="size-4" />{t('workspaceCopy')}</Button>
      <Link href={`/c/${slug}`} target="_blank" rel="noreferrer" className={buttonClass({ variant: 'secondary' })}>
        <Eye aria-hidden className="size-4" />{publicT('preview')}
      </Link>
    </div>
    {status && <p role="status" className="text-sm text-muted">{status}</p>}
  </div>;
}

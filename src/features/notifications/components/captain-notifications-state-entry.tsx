'use client';

import { useT } from '@/core/i18n/client';
import { PageBarTitle } from '@/ui/page-bar-title';
import { messages } from '../messages';

export function CaptainNotificationsStateEntry({ kind, retry }: {
  kind: 'loading' | 'error'; retry?: () => void;
}) {
  const t = useT(messages);
  return <>
    <PageBarTitle title={t('title')} />
    <div className="glass rounded-[18px] p-card" role={kind === 'error' ? 'alert' : 'status'}>
      <p className="text-sm text-muted">{t(kind)}</p>
      {kind === 'error' && <button type="button" onClick={retry}
        className="mt-stack min-h-12 rounded-control px-page-x text-lime">{t('retry')}</button>}
    </div>
  </>;
}

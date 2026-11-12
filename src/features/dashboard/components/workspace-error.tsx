'use client';
import { useRouter } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import { workspaceMessages } from '../workspace-messages';
export function WorkspaceError() {
  const t = useT(workspaceMessages), router = useRouter();
  return <div role="alert" className="glass rounded-card p-5 text-danger">{t('failed')}
    <button className="ms-2 min-h-12 px-3 text-ink" onClick={() => router.refresh()}>{t('retry')}</button>
  </div>;
}

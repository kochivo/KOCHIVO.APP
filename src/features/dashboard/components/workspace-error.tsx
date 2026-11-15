'use client';
import { Button } from '@/ui/button';
import { useRouter } from 'next/navigation';
import { useT } from '@/core/i18n/client';
import { workspaceMessages } from '../workspace-messages';
export function WorkspaceError() {
  const t = useT(workspaceMessages), router = useRouter();
  return <div role="alert" className="glass rounded-card p-card text-danger">{t('failed')}
    <Button variant="secondary" className="ms-inline min-h-12 px-stack text-ink" onClick={() => router.refresh()}>{t('retry')}</Button>
  </div>;
}

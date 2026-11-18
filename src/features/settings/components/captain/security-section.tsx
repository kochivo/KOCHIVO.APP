import { useState } from 'react';
import type { ReactNode } from 'react';
import dynamic from 'next/dynamic';
import { useT } from '@/core/i18n/client';
import { Button } from '@/ui/button';
import { LoadingState } from '@/ui/loading-state';
import { deletionRequestedAt } from '../../deletion';
import { messages } from '../../workspace/messages';
import type { SettingsProfile } from '../../schema';
import { WorkspaceFact } from '../workspace-fact';
import { WorkspaceSheet } from '../workspace-sheet';

const Export = dynamic(() => import('../export-card').then(m => m.ExportCard), { loading: () => <LoadingState variant="detail" /> });
const Delete = dynamic(() => import('../delete-account-card').then(m => m.DeleteAccountCard), { loading: () => <LoadingState variant="detail" /> });

export function SecuritySection({ profile, onSave, signOut, canDelete }: {
  profile: SettingsProfile; onSave: (profile: SettingsProfile) => void; signOut?: ReactNode; canDelete: boolean;
}) {
  const t = useT(messages);
  const [panel, setPanel] = useState<'download' | 'delete' | null>(null);
  return <>
    <WorkspaceFact label={t('download')}><Button variant="secondary" onClick={() => setPanel('download')}>{t('downloadAction')}</Button></WorkspaceFact>
    {signOut && <WorkspaceFact label={t('signOut')}>{signOut}</WorkspaceFact>}
    {canDelete && <WorkspaceFact label={t('delete')} danger>
      <Button variant="secondary" className="text-danger" onClick={() => setPanel('delete')}>{t('deleteAction')}</Button>
    </WorkspaceFact>}
    {panel && <WorkspaceSheet title={t(panel)} onClose={() => setPanel(null)}>
      {panel === 'download' ? <Export /> :
        <Delete requestedAt={profile.deletion_requested_at} onChange={due => onSave({ ...profile, deletion_requested_at: due && deletionRequestedAt(due) })} />}
    </WorkspaceSheet>}
  </>;
}

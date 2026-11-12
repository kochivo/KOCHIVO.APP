import { getT } from '@/core/i18n/server';
import { loadJoinRequests } from '../data/join-requests';
import { messages } from '../messages';
import { JoinRequestsList } from './join-requests-list-entry';
import { Inbox } from 'lucide-react';
import { captainWorkspaceEnabled } from '@/lib/captain-workspace-enabled';

export async function JoinRequests() {
  if (captainWorkspaceEnabled()) return null;
  const t = await getT(messages);
  const result = await loadJoinRequests();
  return <section className="glass min-w-0 space-y-4 rounded-card p-5">
    <h2 className="text-lg font-bold">{t('pending')}</h2>
    {result.error ? <p role="alert" className="text-danger">{result.error}</p> : <div className="min-w-0 space-y-3 [&:has(>div>ul)>.request-empty-icon]:hidden">
      <span className="request-empty-icon flex size-12 items-center justify-center rounded-full border border-dashed border-line text-muted">
        <Inbox aria-hidden className="size-5" />
      </span>
      <JoinRequestsList rows={result.data ?? []} />
    </div>}
  </section>;
}

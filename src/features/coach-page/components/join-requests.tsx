import { getT } from '@/core/i18n/server';
import { loadJoinRequests } from '../data/join-requests';
import { messages } from '../messages';
import { JoinRequestsList } from './join-requests-list';

export async function JoinRequests() {
  const t = await getT(messages);
  const result = await loadJoinRequests();
  return <section className="glass my-6 space-y-4 rounded-card p-5">
    <h2 className="text-lg font-bold">{t('pending')}</h2>
    {result.error ? <p role="alert" className="text-danger">{result.error}</p> : <JoinRequestsList rows={result.data ?? []} />}
  </section>;
}

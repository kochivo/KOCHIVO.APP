import { getT } from '@/core/i18n/server';
import { messages } from '../messages';
import { WorkspaceJoinLoading } from './workspace-join-loading';

export async function CoachPageLoading({ join = false }: { join?: boolean } = {}) {
  if (join) return <WorkspaceJoinLoading />;
  const t = await getT(messages);
  return <main className="mesh min-h-dvh p-6"><p role="status" className="glass-strong rounded-card p-6">{t('loading')}</p></main>;
}

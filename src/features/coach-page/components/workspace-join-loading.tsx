import { getT } from '@/core/i18n/server';
import { PageBarTitle } from '@/ui/page-bar-title';
import { messages } from '../messages';

export async function WorkspaceJoinLoading() {
  const t = await getT(messages);
  return <><PageBarTitle title={t('pending')} /><p role="status" className="glass rounded-card p-card text-muted">{t('loading')}</p></>;
}

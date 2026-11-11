import 'server-only';
import { QueueLoader } from './queue-loader';
import { getT } from '@/core/i18n/server';
import { messages } from './messages';
export async function QueueEntry() {
  const t = await getT(messages);
  return <QueueLoader loadingLabel={t('loading')} />;
}

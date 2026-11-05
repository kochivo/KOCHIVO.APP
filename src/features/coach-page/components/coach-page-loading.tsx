import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

export async function CoachPageLoading() {
  const t = await getT(messages);
  return <main className="mesh min-h-dvh p-6"><p role="status" className="glass-strong rounded-card p-6">{t('loading')}</p></main>;
}

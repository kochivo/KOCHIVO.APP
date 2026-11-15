import { getT } from '@/core/i18n/server';
import { messages } from '../gender/messages';
export async function CoachGenderChip() {
  const t = await getT(messages);
  return <span className="rounded-full bg-surface-raised px-stack py-inline text-sm text-muted">{t('female')}</span>;
}

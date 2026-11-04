'use client';

import { useT } from '@/core/i18n/client';
import { messages } from '../messages';

export function CoachReductionBanner() {
  const t = useT(messages);
  return <p role="status" className="glass rounded-card p-4 text-sm">{t('reduced')}</p>;
}

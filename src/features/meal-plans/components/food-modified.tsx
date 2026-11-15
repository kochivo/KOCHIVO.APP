'use client';

import { useT } from '@/core/i18n/client';
import { messages } from './library/messages';

export function FoodModified() {
  const t = useT(messages);
  return <span className="ms-inline text-micro text-muted">{t('modified')}</span>;
}

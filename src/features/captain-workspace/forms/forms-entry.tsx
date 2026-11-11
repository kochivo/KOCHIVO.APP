'use client';

import type { Locale } from '@/core/i18n/locale';
import { mediaUrls, reviewItem } from '@/features/inbox';
import { FormsScreen } from './forms-screen';

export function FormsEntry({ playerId, locale }: { playerId: string; locale: Locale }) {
  return <FormsScreen playerId={playerId} locale={locale} review={reviewItem} sign={mediaUrls} />;
}

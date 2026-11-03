import { createT } from '@/core/i18n/messages';
import { messages } from './messages';
import type { Locale } from '@/core/i18n/locale';
import { formatNumber } from '@/lib/format';

import { whatsappUrl } from '@/lib/whatsapp';

export type RadarReason = 'no_activity' | 'never_started' | 'no_program';
export interface RadarPlayer {
  player_id: string;
  full_name: string;
  phone: string | null;
  reason: RadarReason;
  days: number;
}
export type RadarResult = { data: RadarPlayer[]; error?: never } | { error: string; data?: never };

export function radarReasonLabel(reason: RadarReason, days: number, locale: Locale = 'ar'): string {
  const t = createT(messages, locale);
  const duration = t('dayCount', { n: days, count: formatNumber(days, locale) });
  switch (reason) {
    case 'no_activity': return t('noWorkoutFor', { v0: duration });
    case 'never_started': return t('hasntStartedFor', { v0: duration });
    case 'no_program': return t('noProgram');
  }
}

export function radarMessage(name: string, reason: RadarReason, locale: Locale = 'ar'): string {
  const t = createT(messages, locale);
  switch (reason) {
    case 'no_activity': return t('hiWeMissYouAtTrainingReady', { v0: name });
    case 'never_started': return t('hiReadyForYourFirstWorkoutIm', { v0: name });
    case 'no_program': return t('hiIllPrepareYourProgramSoWe', { v0: name });
  }
}

export function radarWhatsappUrl(player: Pick<RadarPlayer, 'phone' | 'full_name' | 'reason'>, locale: Locale = 'ar'): string | null {
  if (!player.phone) return null;
  return whatsappUrl({ phone: player.phone, text: radarMessage(player.full_name, player.reason, locale) });
}

import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { messages } from '../light-day/messages';
export function LightDayChip({ light, locale }: { light: boolean; locale: Locale }) {
  return light ? <span className="tone-warn inline-flex items-center gap-inline rounded-md px-inline text-micro font-semibold">{createT(messages, locale)('light')}</span> : null;
}

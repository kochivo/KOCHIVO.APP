import { createT } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { messages } from '../light-day/messages';
export function LightDayChip({ light, locale }: { light: boolean; locale: Locale }) {
  return light ? <span className="rounded-full bg-surface-raised px-stack py-inline text-xs text-muted">{createT(messages, locale)('light')}</span> : null;
}

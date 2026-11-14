import type { ArabicStyle, Locale } from '@/core/i18n/locale';
import { createT } from '@/core/i18n/messages';
import { workspaceMessages } from '../messages';
import type { Question } from '../types';

export function questionTypeLabel(type: Question['type'], locale: Locale, style?: ArabicStyle) {
  return createT(workspaceMessages, locale, style)(type);
}

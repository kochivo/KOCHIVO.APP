import 'server-only';
import { getT } from '@/core/i18n/server';
import type { Locale } from '@/core/i18n/locale';
import { messages } from './messages';

export async function legalMetadata(kind: 'privacy' | 'terms', locale: Locale) {
  const t = await getT(messages, locale);
  return { title: t(`${kind}Title`), description: t(`${kind}Description`) };
}

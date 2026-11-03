import 'server-only';
import { cookies } from 'next/headers';
import { cache } from 'react';
import { LOCALE_COOKIE, parseLocale } from './locale';
import type { Locale } from './locale';
import { createT } from './messages';
import type { Messages } from './messages';

// React scopes this cache to a server render; never share locale state across requests.
const renderLocale = cache((): { value?: Locale } => ({}));

export function setRequestLocale(locale: Locale) {
  renderLocale().value = locale;
}

export async function getLocale() {
  const locale = renderLocale().value;
  if (locale) return locale;
  return parseLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}
export async function getT<M extends Messages>(messages: M, locale?: Locale) {
  return createT(messages, locale ?? await getLocale());
}

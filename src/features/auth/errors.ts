import { createT } from '@/core/i18n/messages';
import type { Translator } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { messages } from './messages';
import { readError } from '@/core/supabase/errors';
import { isAuthError } from '@supabase/supabase-js';

function errorMessages(t: Translator<typeof messages>): Record<string, string> { return {
  invalid_credentials: t('emailOrPasswordIsIncorrect'),
  user_not_found: t('emailOrPasswordIsIncorrect'),
  email_not_confirmed: t('confirmYourEmailFirst'),
  otp_expired: t('codeExpiredOrIncorrectSendA'),
  over_email_send_rate_limit: t('emailRateLimited'),
  over_request_rate_limit: t('waitAMomentAndTryAgain'),
  weak_password: t('useAStrongerPasswordWithLetters'),
  same_password: t('chooseADifferentPassword'),
  user_already_exists: t('trySigningInOrResettingYour'),
  '42501': t('thisAccountCannotDoThat'),
  P0002: t('inviteIsInvalidOrExpired'),
  '23505': t('yourAccountAlreadyHasACoach'),
}; }
export type AuthErrorOptions = {
  sendsEmail?: boolean;
  report?: (error: Error, context: { tags: { area: string; code: string; status: string } }) => void;
};
export function authError(error: unknown, locale: Locale | Translator<typeof messages> = 'ar',
  { sendsEmail = false, report }: AuthErrorOptions = {}): string {
  const t = typeof locale === 'function' ? locale : createT(messages, locale);
  const code = String(readError(error).code ?? '');
  if (sendsEmail && code !== 'over_email_send_rate_limit' && isAuthError(error) &&
    ((error.status ?? 0) >= 500 || code === 'unexpected_failure' || /smtp|sending email/i.test(error.message))) {
    report?.(new Error('Auth email send failed'), {
      tags: { area: 'auth-email', code, status: String(error.status ?? '') },
    });
    return t('emailProviderFailed');
  }
  const mapped = errorMessages(t)[code];
  // Unmapped failures stay generic and silent: only email-provider failures
  // are reported above, and reporting the raw error here would leak the
  // private details it carries (for example an email address) to Sentry.
  return mapped ?? t('somethingWentWrongTryAgain');
}

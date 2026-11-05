import { createT } from '@/core/i18n/messages';
import type { Translator } from '@/core/i18n/messages';
import type { Locale } from '@/core/i18n/locale';
import { messages } from './messages';
import { readError } from '@/core/supabase/errors';

function errorMessages(t: Translator<typeof messages>): Record<string, string> { return {
  invalid_credentials: t('emailOrPasswordIsIncorrect'),
  user_not_found: t('emailOrPasswordIsIncorrect'),
  email_not_confirmed: t('confirmYourEmailFirst'),
  otp_expired: t('codeExpiredOrIncorrectSendA'),
  over_email_send_rate_limit: t('waitAMomentAndTryAgain'),
  over_request_rate_limit: t('waitAMomentAndTryAgain'),
  weak_password: t('useAStrongerPasswordWithLetters'),
  same_password: t('chooseADifferentPassword'),
  user_already_exists: t('trySigningInOrResettingYour'),
  '42501': t('thisAccountCannotDoThat'),
  P0002: t('inviteIsInvalidOrExpired'),
  '23505': t('yourAccountAlreadyHasACoach'),
}; }
export function authError(error: unknown, locale: Locale = 'ar'): string {
  const t = createT(messages, locale);
  const code = String(readError(error).code ?? '');
  return errorMessages(t)[code] ?? t('somethingWentWrongTryAgain');
}

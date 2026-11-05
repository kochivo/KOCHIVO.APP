'use server';
import type { Locale } from '@/core/i18n/locale';
import { getT } from '@/core/i18n/server';
import { messages } from '../messages';

import { hasIntake } from './intake-status';

export async function fetchOnboardingStatus(locale?: Locale) {
  const t = await getT(messages, locale);
  try {
    return { submitted: await hasIntake(locale), statusError: undefined };
  } catch {
    return { submitted: false, statusError: t('couldntLoadYourDetailsTryAgain') };
  }
}

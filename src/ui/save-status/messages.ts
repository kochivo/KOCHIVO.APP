import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard-messages';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { saved: 'محفوظ', saving: 'بيتحفظ…', error: 'الحفظ متعملش', retry: 'جرّب تاني' },
  en: { saved: 'Saved', saving: 'Saving…', error: 'Could not save', retry: 'Retry' },
});

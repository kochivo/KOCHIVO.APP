import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/messages';
export const messages = defineMessages({ ar: { ramadan: 'رمضان', iftar: 'فطار', post_workout: 'بعد التمرين', suhoor: 'سحور', tip: 'قلّل الملح في السحور عشان العطش.' },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; }, en: { ramadan: 'Ramadan', iftar: 'Iftar', post_workout: 'Post-workout', suhoor: 'Suhoor', tip: 'Use less salt at suhoor to reduce thirst.' } });

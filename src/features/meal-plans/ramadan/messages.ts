import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/messages';
export const messages = defineMessages({ ar: { slot: 'وقت رمضان', automatic: 'تلقائي', iftar: 'فطار', post_workout: 'بعد التمرين', suhoor: 'سحور' }, get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  en: { slot: 'Ramadan time', automatic: 'Automatic', iftar: 'Iftar', post_workout: 'Post-workout', suhoor: 'Suhoor' } });

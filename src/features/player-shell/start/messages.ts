import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard-messages';

export const messages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    hello: 'أهلًا {name}', intro: 'كابتن {captain} محتاج يعرف عنك شوية حاجات قبل ما يجهزلك البرنامج',
    progress: 'خلصت {done} من {total}', done: 'تم', start: 'ابدأ', locked: 'البرنامج والأكل هيفتحوا أول ما تبعت',
    next: 'كمّل: {form}', error: 'مش قادرين نحمّل تقييمات البداية', retry: 'جرّب تاني', settings: 'الإعدادات', chat: 'كلم الكابتن',
  },
  en: {
    hello: 'Welcome, {name}', intro: 'Coach {captain} needs to learn about you before preparing your program',
    progress: 'Completed {done} of {total}', done: 'Done', start: 'Start', locked: 'Training and food unlock when you submit',
    next: 'Continue: {form}', error: 'Could not load your starting assessments', retry: 'Try again', settings: 'Settings', chat: 'Chat with coach',
  },
});

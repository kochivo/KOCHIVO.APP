import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './question-messages-standard';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { ask: 'اسأل الكابتن', placeholder: 'اكتب سؤالك…', send: 'ابعت سؤالك على واتساب',
    voice: 'افتح واتساب عشان تسجّل للكابتن', whatsappHint: 'السؤال والتسجيل بيفتحوا واتساب', noContact: 'الكابتن لسه محطش رقمه' },
  en: { ask: 'Ask your coach', placeholder: 'Write your question…', send: 'Send your question on WhatsApp',
    voice: 'Open WhatsApp to record for your coach', whatsappHint: 'Questions and recordings open WhatsApp', noContact: 'Your coach has not added a number yet' },
});

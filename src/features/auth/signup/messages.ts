import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? { playerAccount: 'هذا البريد مرتبط بحساب لاعب. سجّل الدخول من رابط الكابتن، أو استخدم بريداً آخر لحساب الكابتن' } : undefined; },
  ar: {
    playerAccount: 'الإيميل ده لحساب لاعب موجود. ادخل من لينك الكابتن، أو استخدم إيميل تاني لحساب الكابتن',
  },
  en: {
    playerAccount: "This is an existing player account. Use your coach's link or another email for a coach account",
  },
});

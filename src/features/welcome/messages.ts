import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/messages';

export const messages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    welcomeSlogan: 'YOUR NEXT MOVE STARTS HERE.',
    welcomeLine: 'خطوتك الجاية بتبدأ من هنا.', welcomeStart: 'يلا نبدأ', welcomeLogin: 'سجّل دخولك',
    welcomeWho: 'إنت مين؟', welcomeChoose: 'هنجهّزلك التطبيق على حسب اختيارك.',
    welcomePlayer: 'أنا لاعب', welcomePlayerHint: 'معايا دعوة من كابتن', welcomeCaptain: 'أنا كابتن',
    welcomeCaptainHint: 'عايز أتابع لاعيبتي', welcomeAccount: 'عندك حساب؟',
    welcomeBack: 'رجوع', welcomeCode: 'ادخل كود الدعوة',
    welcomeCodeLabel: 'كود الدعوة أو لينك الدعوة', welcomeCodeHint: 'مفيش كود؟ اطلبه من كابتنك.',
    welcomeInvalidCode: 'اكتب كود دعوة أو لينك دعوة مظبوط', welcomeBrand: 'KOCHIVO',
    continue: "كمّل",
  },
  en: {
    welcomeSlogan: 'YOUR NEXT MOVE STARTS HERE.',
    welcomeLine: 'Your next move starts here.', welcomeStart: "Let's get started", welcomeLogin: 'Sign in',
    welcomeWho: 'Who are you?', welcomeChoose: 'We will set up the app for your choice.',
    welcomePlayer: "I'm a player", welcomePlayerHint: 'I have an invite from my coach', welcomeCaptain: "I'm a coach",
    welcomeCaptainHint: 'I want to manage my players', welcomeAccount: 'Have an account?',
    welcomeBack: 'Back', welcomeCode: 'Enter your invite code',
    welcomeCodeLabel: 'Invite code or invite link', welcomeCodeHint: 'No code? Ask your coach.',
    welcomeInvalidCode: 'Enter a valid invite code or link', welcomeBrand: 'KOCHIVO',
    continue: "Continue",
  },
});

import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/messages';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { brand: 'KOCHIVO', slogan: 'Your next move starts here', arabicLine: 'خطوتك الجاية بتبدأ من هنا',
    rank: '{name} بقى {tier}', crown: '{name} أخد تاج الشهر', captain: 'الكابتن {name}', player: 'لاعب',
    beginner: 'مبتدئ', champion: 'بطل', elite: 'نخبة', legend: 'أسطورة' },
  en: { brand: 'KOCHIVO', slogan: 'Your next move starts here', arabicLine: 'خطوتك الجاية بتبدأ من هنا',
    rank: '{name} reached {tier}', crown: '{name} took this month’s crown', captain: 'Captain {name}', player: 'Player',
    beginner: 'Beginner', champion: 'Champion', elite: 'Elite', legend: 'Legend' },
});

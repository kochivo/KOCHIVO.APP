import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/messages';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { site: 'KOCHIVO.SITE', reached: 'وصل لرتبة', pointsLabel: 'نقطة', workoutsLabel: 'تمرين', brand: 'KOCHIVO', slogan: 'Your next move starts here', arabicLine: 'خطوتك الجاية بتبدأ من هنا',
    newRank: 'رتبة جديدة', monthlyCrown: 'تاج الشهر', crownAction: 'أخد تاج الشهر', points: '{n} نقطة', workouts: '{n} تمرين', withCaptain: 'مع الكابتن',
    rank: '{name} بقى {tier}', crown: '{name} أخد تاج الشهر', captain: 'الكابتن {name}', player: 'لاعب',
    beginner: 'مبتدئ', champion: 'بطل', elite: 'نخبة', legend: 'أسطورة' },
  en: { site: 'KOCHIVO.SITE', reached: 'Reached', pointsLabel: 'points', workoutsLabel: 'workouts', brand: 'KOCHIVO', slogan: 'Your next move starts here', arabicLine: 'خطوتك الجاية بتبدأ من هنا',
    newRank: 'New rank', monthlyCrown: 'Monthly crown', crownAction: 'took this month’s crown', points: '{n} points', workouts: '{n} workouts', withCaptain: 'With Captain',
    rank: '{name} reached {tier}', crown: '{name} took this month’s crown', captain: 'Captain {name}', player: 'Player',
    beginner: 'Beginner', champion: 'Champion', elite: 'Elite', legend: 'Legend' },
});

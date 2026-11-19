import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/messages';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { site: 'KOCHIVO.SITE', reached: 'وصل لرتبة', pointsLabel: 'نقطة', workoutsLabel: 'تمرين', brand: 'KOCHIVO', slogan: 'Your next move starts here', arabicLine: 'خطوتك الجاية بتبدأ من هنا',
    newRank: 'رتبة جديدة', monthlyCrown: 'تاج الشهر', crownAction: 'أخد تاج الشهر', 'points.one': "نقطة واحدة", 'points.two': "نقطتين", 'points.few': "{n} نقط", 'points.many': "{n} نقطة", 'points.other': "{n} نقطة", 'workouts.one': "تمرين واحد", 'workouts.two': "تمرينين", 'workouts.few': "{n} تمارين", 'workouts.many': "{n} تمرين", 'workouts.other': "{n} تمرين", withCaptain: 'مع الكابتن',
    rank: '{name} بقى {tier}', crown: '{name} أخد تاج الشهر', captain: 'الكابتن {name}', player: 'لاعب',
    beginner: 'مبتدئ', champion: 'بطل', elite: 'نخبة', legend: 'أسطورة' },
  en: { site: 'KOCHIVO.SITE', reached: 'Reached', pointsLabel: 'points', workoutsLabel: 'workouts', brand: 'KOCHIVO', slogan: 'Your next move starts here', arabicLine: 'خطوتك الجاية بتبدأ من هنا',
    newRank: 'New rank', monthlyCrown: 'Monthly crown', crownAction: 'took this month’s crown', 'points.one': "{n} point", 'points.other': "{n} points", 'workouts.one': "{n} workout", 'workouts.other': "{n} workouts", withCaptain: 'With Captain',
    rank: '{name} reached {tier}', crown: '{name} took this month’s crown', captain: 'Captain {name}', player: 'Player',
    beginner: 'Beginner', champion: 'Champion', elite: 'Elite', legend: 'Legend' },
});

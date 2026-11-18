import { defineMessages } from '@/core/i18n/messages';

const arStd = {
  monthSummary: '{month} · الأيام المتبقية: {days}',
  firstMonthly: 'الأول هذا الشهر', firstAllTime: 'الأول في الترتيب العام',
  rank: 'المركز', player: 'اللاعب', medal: 'الميدالية', workouts: 'التمارين', points: 'النقاط',
  leaderMedal: 'ميدالية {medal}', missing: '—',
  prizeMonth: 'جائزة {month}', unset: 'لم تُحدد', edit: 'تعديل', set: 'حددها',
  prizeLoadError: 'تعذّر تحميل الجائزة.',
  scoring: 'كيف تُحتسب النقاط؟', workout: 'تمرين مستوفٍ للشروط', week: 'أسبوع كامل دون غياب',
  record: 'رقم قياسي جديد', signedPoints: '+{points}',
  zeroNote: 'يظهر اللاعبون بدون نقاط في الجدول حسب ترتيبهم.',
} as const;

export const workspaceMessages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    monthSummary: '{month} · باقي {days} يوم على نهاية الشهر',
    firstMonthly: 'الأول الشهر ده', firstAllTime: 'الأول على كل الوقت',
    rank: 'المركز', player: 'اللاعب', medal: 'الميدالية', workouts: 'تمارين', points: 'النقط',
    leaderMedal: 'ميدالية {medal}', missing: '—',
    prizeMonth: 'جايزة {month}', unset: 'مش متحددة', edit: 'عدّل', set: 'حددها',
    prizeLoadError: 'مش قادرين نحمّل الجايزة.',
    scoring: 'النقط بتتحسب إزاي؟', workout: 'تمرين مستوفي الشروط', week: 'أسبوع كامل من غير غياب',
    record: 'رقم جديد', signedPoints: '+{points}',
    zeroNote: 'اللاعيبة اللي معندهاش نقط بتظهر في الجدول بترتيبها.',
  },
  en: {
    monthSummary: '{month} · {days} days left',
    firstMonthly: 'First this month', firstAllTime: 'First all time',
    rank: 'Rank', player: 'Player', medal: 'Medal', workouts: 'Workouts', points: 'Points',
    leaderMedal: '{medal} medal', missing: '—',
    prizeMonth: '{month} prize', unset: 'No prize set', edit: 'Edit', set: 'Set prize',
    prizeLoadError: 'Could not load the prize.',
    scoring: 'How players earn points', workout: 'Qualifying workout', week: 'Full week with no missed workouts',
    record: 'New personal record', signedPoints: '+{points}',
    zeroNote: 'Players with zero points stay in rank order.',
  },
});

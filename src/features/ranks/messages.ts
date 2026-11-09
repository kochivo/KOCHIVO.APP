import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    pageTitle: 'رتبتك', beginner: 'مبتدئ', champion: 'بطل', elite: 'نخبة', legend: 'أسطورة', crown: 'التاج',
    lifetime: 'نقطك من أول يوم', points: '{n} نقطة', next: 'فاضلك {n} نقطة لرتبة {tier}', top: 'وصلت لأعلى رتبة',
    journey: 'رحلتك', race: 'سباق التاج الشهر ده', holder: 'التاج معاك الشهر ده', gap: 'فاضلك {n} نقطة وتاخد التاج',
    position: 'المركز {n}', monthly: '{n} نقطة الشهر ده', reset: 'السباق بيبدأ من جديد يوم 1 من كل شهر',
    minimum: 'التاج محتاج على الأقل {n} نقطة في الشهر', noCaptain: 'انضم لكابتن عشان تدخل سباق التاج',
    board: 'فريقك', emptyBoard: 'لسه محدش كسب نقط الشهر ده', log: 'آخر نقط كسبتها',
    emptyLog: 'لسه ما كسبتش نقط. كمّل أول تمرين', workout: 'تمرين', pr: 'رقم جديد', perfect_week: 'أسبوع كامل',
    inbody: 'قياس InBody', meal_check: 'متابعة الأكل', pending: 'مستني مراجعة الكابتن', rejected: 'اترفضت',
    celebration: 'مبروك! بقيت {tier}', continue: 'كمّل', chip: 'افتح رتبتك: {tier}، {n} نقطة',
    error: 'مش قادرين نحمّل رتبتك دلوقتي', retry: 'جرّب تاني',
  },
  en: {
    pageTitle: 'Your rank', beginner: 'Beginner', champion: 'Champion', elite: 'Elite', legend: 'Legend', crown: 'Crown',
    lifetime: 'Lifetime points', points: '{n} points', next: '{n} points to {tier}', top: 'Top rank reached',
    journey: 'Your journey', race: 'This month’s crown race', holder: 'You hold the crown this month', gap: '{n} points to the crown',
    position: 'Position {n}', monthly: '{n} points this month', reset: 'Resets on the 1st of each month',
    minimum: 'The crown needs at least {n} points this month', noCaptain: 'Join a captain to enter the crown race',
    board: 'Your team', emptyBoard: 'Nobody has points this month', log: 'Latest points',
    emptyLog: 'No points yet. Finish your first workout', workout: 'Workout', pr: 'Personal record', perfect_week: 'Perfect week',
    inbody: 'InBody scan', meal_check: 'Meal check', pending: 'Waiting for captain review', rejected: 'Rejected',
    celebration: 'Congratulations! You reached {tier}', continue: 'Continue', chip: 'Open your rank: {tier}, {n} points',
    error: 'Couldn’t load your rank', retry: 'Try again',
  },
});

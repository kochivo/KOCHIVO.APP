import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    pageTitle: 'رتبتك', beginner: 'مبتدئ', champion: 'بطل', elite: 'نخبة', legend: 'أسطورة', crown: 'التاج',
    lifetime: 'نقطك من أول يوم', points: '{n} نقطة', next: 'فاضلك {n} نقطة لرتبة {tier}', top: 'وصلت لأعلى رتبة',
    journey: 'رحلتك', race: 'سباق التاج الشهر ده', holder: 'التاج معاك الشهر ده', gap: 'فاضلك {n} درجة وتاخد التاج',
    position: 'المركز {n}', adherence: 'التزامك {n}٪', percent: '{n}٪', workouts: '{done} من {planned} تمرين الشهر ده',
    needsWorkout: 'فاضلك تمرين واحد عشان تدخل سباق التاج', needsWorkouts: 'فاضلك {n} تمارين عشان تدخل سباق التاج',
    reset: 'السباق بيبدأ من جديد يوم 1 من كل شهر',
    rule: 'التاج لأعلى التزام بالخطة، بحد أدنى {n} تمارين في الشهر. الأرقام الجديدة والـInBody بيزودوا درجتك.',
    noCaptain: 'انضم لكابتن عشان تدخل سباق التاج',
    board: 'فريقك', emptyBoard: 'لسه محدش اتمرن الشهر ده', log: 'آخر نقط كسبتها',
    emptyLog: 'لسه ما كسبتش نقط. كمّل أول تمرين', workout: 'تمرين', pr: 'رقم جديد', perfect_week: 'أسبوع كامل',
    inbody: 'قياس InBody', meal_check: 'متابعة الأكل', pending: 'مستني مراجعة الكابتن', rejected: 'اترفضت',
    celebration: 'مبروك! بقيت {tier}', continue: 'كمّل', chip: 'افتح رتبتك: {tier}، {n} نقطة',
    error: 'مش قادرين نحمّل رتبتك دلوقتي', retry: 'جرّب تاني',
  },
  en: {
    pageTitle: 'Your rank', beginner: 'Beginner', champion: 'Champion', elite: 'Elite', legend: 'Legend', crown: 'Crown',
    lifetime: 'Lifetime points', points: '{n} points', next: '{n} points to {tier}', top: 'Top rank reached',
    journey: 'Your journey', race: 'This month’s crown race', holder: 'You hold the crown this month', gap: '{n} to the crown',
    position: 'Position {n}', adherence: '{n}% of your plan', percent: '{n}%', workouts: '{done} of {planned} workouts this month',
    needsWorkout: '{n} more workout to enter the crown race', needsWorkouts: '{n} more workouts to enter the crown race',
    reset: 'Resets on the 1st of each month',
    rule: 'The crown goes to the highest plan adherence, with at least {n} workouts this month. Records and InBody scans add to your score.',
    noCaptain: 'Join a captain to enter the crown race',
    board: 'Your team', emptyBoard: 'Nobody has trained this month', log: 'Latest points',
    emptyLog: 'No points yet. Finish your first workout', workout: 'Workout', pr: 'Personal record', perfect_week: 'Perfect week',
    inbody: 'InBody scan', meal_check: 'Meal check', pending: 'Waiting for captain review', rejected: 'Rejected',
    celebration: 'Congratulations! You reached {tier}', continue: 'Continue', chip: 'Open your rank: {tier}, {n} points',
    error: 'Couldn’t load your rank', retry: 'Try again',
  },
});

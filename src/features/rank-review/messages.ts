import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    title: 'ترتيب الفريق', crown: 'تاج الفريق', player: 'لاعب',
    noCrown: 'لسه محدش أخد التاج الشهر ده', rule: 'التاج لصاحب أعلى نقاط في الشهر، بحد أدنى {count} نقطة.',
    monthly: '{count} نقطة للشهر', lifetime: '{count} نقطة إجمالي',
    beginner: 'مبتدئ', champion: 'بطل', elite: 'نخبة', legend: 'أسطورة',
    empty: 'لسه مفيش لاعيبة', emptyBody: 'لما تضيف لاعيبة، ترتيبهم هيظهر هنا.',
    previous: 'الشهر اللي فات', next: 'الشهر اللي جاي',
    pending: 'تمارين محتاجة مراجعتك', approve: 'احسبها', reject: 'ارفض',
    confirm: 'ترفض التمرين؟ القرار نهائي ومش هتقدر تغيّره.',
    duration: '{count} دقيقة', unknownDuration: 'مدة التمرين مش متاحة',
    error: 'مش قادرين نحمّل الترتيب. جرّب تاني.', pendingError: 'مش قادرين نحمّل التمارين. جرّب تاني.',
    decisionError: 'القرار متسجلش. التمرين رجع للقائمة، جرّب تاني.',
    retry: 'جرّب تاني', pendingCount: '{count} للمراجعة',
  },
  en: {
    title: 'Team ranking', crown: 'Team crown', player: 'Player',
    noCrown: 'Nobody holds the crown yet this month', rule: 'The monthly leader holds the crown with at least {count} points.',
    monthly: '{count} monthly points', lifetime: '{count} lifetime points',
    beginner: 'Beginner', champion: 'Champion', elite: 'Elite', legend: 'Legend',
    empty: 'No players yet', emptyBody: 'Add players to see their ranking here.',
    previous: 'Previous month', next: 'Next month',
    pending: 'Workouts to review', approve: 'Count it', reject: 'Reject',
    confirm: 'Reject this workout? This decision is final and cannot be changed.',
    duration: '{count} minutes', unknownDuration: 'Workout duration unavailable',
    error: 'Could not load the ranking. Try again.', pendingError: 'Could not load workouts. Try again.',
    decisionError: 'Decision failed. The workout is back in the list. Try again.',
    retry: 'Try again', pendingCount: '{count} to review',
  },
});

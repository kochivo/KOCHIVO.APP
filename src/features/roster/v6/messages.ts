import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard-messages';
export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    players: 'اللاعبين', capacity: '{active} لاعب نشط · {free} أماكن فاضية في باقتك', add: 'ضيف لاعب',
    active: 'نشطين', needsProgram: 'محتاج برنامج', late: 'متأخرين', ending: 'اشتراكه هيخلص', requests: 'طلبات انضمام',
    search: 'دوّر باسم اللاعب', player: 'اللاعب', lastWorkout: 'آخر تمرين', plan: 'الخطة', subscription: 'الاشتراك',
    noFood: 'مفيش نظام أكل لسه', noProgram: 'مفيش برنامج لسه', days: 'باقي {count} يوم',
    menu: 'اختيارات {name}', preview: 'شوف كلاعب', archive: 'أرشفة', empty: 'مفيش لاعبين بالفلتر ده',
    error: 'مش قادرين نحمّل اللاعبين', retry: 'جرّب تاني', loading: 'بنحمّل اللاعبين…',
    unknown: '—', goal: 'الهدف', lose: 'تنشيف', gain: 'بناء عضل', maintain: 'حفاظ على الوزن',
    new: 'مبتدئ', under_1y: 'أقل من سنة', experienced: 'خبرة أكتر من سنة',
  },
  en: {
    players: 'Players', capacity: '{active} active players · {free} places left in your plan', add: 'Add player',
    active: 'Active', needsProgram: 'Needs a program', late: 'Late', ending: 'Expiring soon', requests: 'Join requests',
    search: 'Search by player name', player: 'Player', lastWorkout: 'Last workout', plan: 'Plan', subscription: 'Subscription',
    noFood: 'No meal plan yet', noProgram: 'No program yet', days: '{count} days left',
    menu: 'Options for {name}', preview: 'View as player', archive: 'Archive', empty: 'No players match this filter',
    error: 'Could not load players', retry: 'Retry', loading: 'Loading players…',
    unknown: '—', goal: 'Goal', lose: 'Fat loss', gain: 'Build muscle', maintain: 'Maintain weight',
    new: 'Just starting', under_1y: 'Under a year', experienced: 'Over a year of experience',
  },
});

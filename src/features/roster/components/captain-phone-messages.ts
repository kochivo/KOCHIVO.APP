import { defineMessages } from '@/core/i18n/messages';

const arStd = {
  openingAction: 'جارٍ فتح الإجراء…', actionUnavailable: 'تعذّر فتح الإجراء. يمكنك اختيار إجراء آخر.',
  navigation: 'التنقل', quickAdd: 'إضافة سريعة', chooseAction: 'ماذا تريد أن تفعل؟',
  addPlayer: 'أضف لاعبًا', payment: 'سجّل دفعة', program: 'برنامج جديد',
  mealPlan: 'خطة غذائية', assessment: 'أرسل تقييمًا', invite: 'رابط الدعوة',
  choosePlayer: 'اختر لاعبًا', noPlayers: 'أضف لاعبًا أولًا',
  usage: '{plan} · {used} من {limit} لاعبًا',
  entry: 'البداية', champion: 'البطل', legend: 'الأسطورة', empire: 'الإمبراطورية',
} as const;

export const phoneMessages = defineMessages({
  ar: {
    openingAction: 'بنفتح الإجراء…', actionUnavailable: 'الإجراء مافتحش. تقدر تختار إجراء تاني.',
    navigation: 'التنقّل', quickAdd: 'إضافة سريعة', chooseAction: 'عاوز تعمل إيه؟',
    addPlayer: 'ضيف لاعب', payment: 'سجّل دفعة', program: 'برنامج جديد',
    mealPlan: 'نظام أكل', assessment: 'ابعت تقييم', invite: 'لينك الدعوة',
    choosePlayer: 'اختار لاعب', noPlayers: 'ضيف لاعب الأول',
    usage: '{plan} · {used} من {limit} لاعب',
    entry: 'البداية', champion: 'البطل', legend: 'الأسطورة', empire: 'الإمبراطورية',
  },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  en: {
    openingAction: 'Opening action…', actionUnavailable: 'Could not open the action. You can choose another action.',
    navigation: 'Navigation', quickAdd: 'Quick add', chooseAction: 'What do you want to do?',
    addPlayer: 'Add player', payment: 'Record payment', program: 'New program',
    mealPlan: 'Meal plan', assessment: 'Send assessment', invite: 'Invite link',
    choosePlayer: 'Choose a player', noPlayers: 'Add a player first',
    usage: '{plan} · {used} of {limit} players',
    entry: 'Entry', champion: 'Champion', legend: 'Legend', empire: 'Empire',
  },
});

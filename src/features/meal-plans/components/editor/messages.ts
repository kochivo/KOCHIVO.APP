import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/messages';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    training: 'يوم تمرين', rest: 'يوم راحة', all: 'كل الأيام', cycles: 'فعّل أيام التمرين والراحة', copy: 'انسخ من يوم التمرين',
    send: 'ابعت لـ{name}', saved: 'اتحفظ', notes: 'ملاحظات تساعدك', clear: 'مفيش ملاحظات على الخطة',
    conflict: '{name}: راجع {reason}', gap: 'زوّد {name} بمقدار {grams} جرام عشان تكمل {macro}',
    adherence: 'التزام آخر ٧ أيام', day: '{date}: {done} / {total}', missing: 'مش لاقيها؟ أضفها',
    dayType: 'نوع اليوم', unit: 'وحدة الكمية', quantity: 'كمية {name}', protein: 'البروتين', carbs: 'الكارب', fat: 'الدهون',
    apply: 'طبّق الزيادة', useAlternative: 'استخدم {name}', contextError: 'بيانات اللاعب متحملتش. جرّب تاني',
    dairy: 'حساسية الألبان', eggs: 'حساسية البيض', nuts: 'حساسية المكسرات', gluten: 'حساسية الجلوتين',
    seafood: 'حساسية السمك والقشريات', fish: 'حساسية السمك', shellfish: 'حساسية القشريات',
    soy: 'حساسية الصويا', sesame: 'حساسية السمسم', diabetes: 'السكر', bloodPressure: 'ضغط الدم',
  },
  en: {
    training: 'Training day', rest: 'Rest day', all: 'Every day', cycles: 'Enable training and rest days', copy: 'Copy training day',
    send: 'Send to {name}', saved: 'Saved', notes: 'Smart notes', clear: 'No notes for this plan',
    conflict: '{name}: check {reason}', gap: 'Increase {name} by {grams} g to reach {macro}',
    adherence: 'Last 7 days', day: '{date}: {done} / {total}', missing: "Can't find it? Add it",
    dayType: 'Day type', unit: 'Portion unit', quantity: 'Quantity of {name}', protein: 'protein', carbs: 'carbs', fat: 'fat',
    apply: 'Apply increase', useAlternative: 'Use {name}', contextError: 'Could not load player details. Try again',
    dairy: 'dairy allergy', eggs: 'egg allergy', nuts: 'nut allergy', gluten: 'gluten allergy',
    seafood: 'seafood allergy', fish: 'fish allergy', shellfish: 'shellfish allergy',
    soy: 'soy allergy', sesame: 'sesame allergy', diabetes: 'diabetes', bloodPressure: 'blood pressure',
  },
});

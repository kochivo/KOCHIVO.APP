import { defineMessages } from '@/core/i18n/messages';

const arStd = {
  title: 'صفحتك العامة', specialties: 'تخصصاتك', hint: 'حتى 6 تخصصات، كل منها من حرفين إلى 30 حرفاً',
  add: 'أضف تخصصاً', remove: 'احذف {name}', years: 'سنوات الخبرة', languages: 'اللغات', ar: 'العربية', en: 'الإنجليزية',
  stats: 'إظهار الأرقام', minimum: 'تظهر الأرقام عند وجود 5 لاعبين على الأقل، وتُحسب من التطبيق.',
  packages: 'إعدادات الباقات', preview: 'معاينة صفحتك', noSlug: 'اختر رابطاً لصفحتك أدناه.',
  save: 'احفظ', saving: 'جارٍ الحفظ…', saved: 'تم الحفظ', rollback: 'تعذر الحفظ، استعدنا آخر بيانات محفوظة. حاول مرة أخرى',
  invalid: 'راجع التخصصات وسنوات الخبرة (من 0 إلى 60).',
  lessExperience: 'قلّل سنوات الخبرة', moreExperience: 'زد سنوات الخبرة',
} as const;

export const messages = defineMessages({
  ar: {
    lessExperience: 'قلّل سنين الخبرة', moreExperience: 'زوّد سنين الخبرة',
    title: 'صفحتك العامة', specialties: 'تخصصاتك', hint: 'لحد 6 تخصصات، كل واحد من حرفين لـ30 حرف',
    add: 'ضيف تخصص', remove: 'شيل {name}', years: 'سنين الخبرة', languages: 'اللغات', ar: 'عربي', en: 'إنجليزي',
    stats: 'اظهر الأرقام', minimum: 'الأرقام بتظهر لما يبقى معاك 5 لاعيبة على الأقل، وبتتحسب من التطبيق.',
    packages: 'إعدادات الباقات', preview: 'شوف صفحتك', noSlug: 'اختار لينك لصفحتك تحت.',
    save: 'احفظ', saving: 'بنحفظ…', saved: 'اتحفظ', rollback: 'الحفظ متعملش، رجّعنا آخر بيانات محفوظة. جرّب تاني',
    invalid: 'راجع التخصصات وسنين الخبرة (من 0 لـ60).',
  },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  en: {
    lessExperience: 'Decrease years of experience', moreExperience: 'Increase years of experience',
    title: 'Your public page', specialties: 'Specialties', hint: 'Up to 6 specialties, 2 to 30 characters each',
    add: 'Add specialty', remove: 'Remove {name}', years: 'Years of experience', languages: 'Languages', ar: 'Arabic', en: 'English',
    stats: 'Show numbers', minimum: 'Numbers appear with at least 5 players and are calculated by the app.',
    packages: 'Package settings', preview: 'Preview your page', noSlug: 'Choose a link for your page below.',
    save: 'Save', saving: 'Saving…', saved: 'Saved', rollback: 'Save failed. Restored your saved details. Try again',
    invalid: 'Check specialties and years of experience (0 to 60).',
  },
});

import { defineMessages } from '@/core/i18n/messages';

import { arStd } from './standard/messages';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    modified: 'معدّلة', restore: 'رجّع الأصل', confirmRestore: 'ترجّع الأكلة الأصلية؟ الخطط الحالية هتفضل زي ما هي',
    forms: 'التقييمات',
    title: 'مكتبة الأكلات', subtitle: 'أكلاتك والقيم الغذائية في مكان واحد', search: 'دوّر بالعربي أو English',
    all: 'الكل', mine: 'أكلاتي', global: 'العامة', new: 'أكلة جديدة', food: 'الأكلة · لكل 100 جم',
    kcal: 'سعرات', protein: 'بروتين', carbs: 'كارب', fat: 'دهون', units: 'وحدات', usage: 'في أنظمة',
    per100: 'لكل 100 جم', empty: 'مفيش أكلات بالبحث ده', loading: 'بنحمّل الأكلات…',
    error: 'مش قادرين نحمّل الأكلات. جرّب تاني', retry: 'جرّب تاني', next: 'التالي', first: 'أول صفحة',
    name: 'الاسم بالعربي', nameEn: 'الاسم بالإنجليزي', photo: 'صورة', save: 'احفظ', close: 'اقفل',
    copy: 'انسخ لأكلاتي', readonly: 'تعديلاتك هتظهر ليك وللاعيبتك بس',
    mismatch: 'السعرات مش متطابقة مع الماكروز. تقدر تحفظ بعد المراجعة',
    duplicate: 'فيه أكلة بنفس الاسم. راجعها قبل الحفظ', addUnit: 'ضيف وحدة', removeUnit: 'شيل الوحدة',
    unitAr: 'الوحدة بالعربي', unitEn: 'الوحدة بالإنجليزي', grams: 'جرام', noUnits: 'مفيش وحدات',
    delete: 'امسح الأكلة', 'blocked.one': "مش ممكن تمسحها؛ مستخدمة مرة واحدة في الخطط", 'blocked.two': "مش ممكن تمسحها؛ مستخدمة مرتين في الخطط", 'blocked.few': "مش ممكن تمسحها؛ مستخدمة {count} مرات في الخطط", 'blocked.many': "مش ممكن تمسحها؛ مستخدمة {count} مرة في الخطط", 'blocked.other': "مش ممكن تمسحها؛ مستخدمة {count} مرة في الخطط",
    confirmDelete: 'متأكد إنك عايز تمسح الأكلة؟', saving: 'بنحفظ…', duplicateError: 'مش قادرين نراجع الأسماء. جرّب تاني',
  },
  en: {
    modified: 'Modified', restore: 'Restore original', confirmRestore: 'Restore the original food? Existing plans will stay the same',
    forms: 'Assessments',
    title: 'Foods library', subtitle: 'Your foods and nutrition in one place', search: 'Search Arabic or English',
    all: 'All', mine: 'My foods', global: 'Global', new: 'New food', food: 'Food · per 100 g',
    kcal: 'kcal', protein: 'Protein', carbs: 'Carbs', fat: 'Fat', units: 'Units', usage: 'In plans',
    per100: 'Per 100 g', empty: 'No foods match this search', loading: 'Loading foods…',
    error: 'Could not load foods. Try again', retry: 'Try again', next: 'Next', first: 'First page',
    name: 'Arabic name', nameEn: 'English name', photo: 'Photo', save: 'Save', close: 'Close',
    copy: 'Copy to my foods', readonly: 'Your changes appear only for you and your players',
    mismatch: 'Calories do not match macros. You can still save after reviewing',
    duplicate: 'A food has the same name. Review before saving', addUnit: 'Add unit', removeUnit: 'Remove unit',
    unitAr: 'Arabic unit', unitEn: 'English unit', grams: 'Grams', noUnits: 'No units',
    delete: 'Delete food', 'blocked.one': "Cannot delete; used {count} time in plans", 'blocked.other': "Cannot delete; used {count} times in plans",
    confirmDelete: 'Delete this food?', saving: 'Saving…', duplicateError: 'Could not check names. Try again',
  },
});

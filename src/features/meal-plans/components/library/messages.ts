import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    forms: 'الفورمز',
    title: 'مكتبة الأكلات', subtitle: 'أكلاتك والقيم الغذائية في مكان واحد', search: 'دوّر بالعربي أو English',
    all: 'الكل', mine: 'أكلاتي', global: 'العامة', new: 'أكلة جديدة', food: 'الأكلة',
    kcal: 'سعرات', protein: 'بروتين', carbs: 'كارب', fat: 'دهون', units: 'الوحدات', usage: 'في خطط',
    per100: 'لكل 100 جم', empty: 'مفيش أكلات بالبحث ده', loading: 'بنحمّل الأكلات…',
    error: 'مش قادرين نحمّل الأكلات. جرّب تاني', retry: 'جرّب تاني', next: 'التالي', first: 'أول صفحة',
    name: 'الاسم بالعربي', nameEn: 'الاسم بالإنجليزي', photo: 'صورة', save: 'احفظ', close: 'اقفل',
    copy: 'انسخ لأكلاتي', readonly: 'أكلة عامة. انسخها لأكلاتك عشان تعدّلها',
    mismatch: 'السعرات مش متطابقة مع الماكروز. تقدر تحفظ بعد المراجعة',
    duplicate: 'فيه أكلة بنفس الاسم. راجعها قبل الحفظ', addUnit: 'ضيف وحدة', removeUnit: 'شيل الوحدة',
    unitAr: 'الوحدة بالعربي', unitEn: 'الوحدة بالإنجليزي', grams: 'جرام', noUnits: 'مفيش وحدات',
    delete: 'امسح الأكلة', blocked: 'مش ممكن تمسحها؛ مستخدمة {count} مرة في الخطط',
    confirmDelete: 'متأكد إنك عايز تمسح الأكلة؟', saving: 'بنحفظ…', duplicateError: 'مش قادرين نراجع الأسماء. جرّب تاني',
  },
  en: {
    forms: 'Forms',
    title: 'Foods library', subtitle: 'Your foods and nutrition in one place', search: 'Search Arabic or English',
    all: 'All', mine: 'My foods', global: 'Global', new: 'New food', food: 'Food',
    kcal: 'kcal', protein: 'Protein', carbs: 'Carbs', fat: 'Fat', units: 'Units', usage: 'In plans',
    per100: 'Per 100 g', empty: 'No foods match this search', loading: 'Loading foods…',
    error: 'Could not load foods. Try again', retry: 'Try again', next: 'Next', first: 'First page',
    name: 'Arabic name', nameEn: 'English name', photo: 'Photo', save: 'Save', close: 'Close',
    copy: 'Copy to my foods', readonly: 'Global food. Copy it to edit',
    mismatch: 'Calories do not match macros. You can still save after reviewing',
    duplicate: 'A food has the same name. Review before saving', addUnit: 'Add unit', removeUnit: 'Remove unit',
    unitAr: 'Arabic unit', unitEn: 'English unit', grams: 'Grams', noUnits: 'No units',
    delete: 'Delete food', blocked: 'Cannot delete; used {count} times in plans',
    confirmDelete: 'Delete this food?', saving: 'Saving…', duplicateError: 'Could not check names. Try again',
  },
});

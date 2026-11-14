import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    title: 'مكتبة التمارين', new: 'تمرين جديد', search: 'دوّر بالعربي أو الإنجليزي',
    all: 'الكل', legs: 'رجل', chest: 'صدر', back: 'ضهر', shoulders: 'كتف', arms: 'دراع', abs: 'بطن', cardio: 'كارديو',
    equipment: 'الأدوات', allEquipment: 'كل الأدوات', barbell: 'بار', dumbbell: 'دمبل', machine: 'جهاز', cable: 'كابل', bodyweight: 'وزن الجسم',
    mine: 'تماريني', own: 'بتاعي', loading: 'بنحمّل التمارين', error: 'مش قادرين نحمّل التمارين. جرّب تاني.', retry: 'جرّب تاني',
    empty: 'مفيش تمرين بالاسم ده', emptyMine: 'لسه معملتش تمرين خاص. اعمل واحد من زرار تمرين جديد.',
    target: 'العضلة الأساسية', secondary: 'العضلات المساعدة', instructions: 'طريقة الأداء',
    missing: 'مش متسجل', noMedia: 'مفيش صورة للتمرين', video: 'شوف فيديو التمرين', edit: 'عدّل', close: 'اقفل',
    next: 'التالي', previous: 'السابق', count: '{count} تمرين',
  },
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? {
    title: 'مكتبة التمارين', new: 'تمرين جديد', search: 'ابحث بالعربية أو الإنجليزية',
    all: 'الكل', legs: 'أرجل', chest: 'صدر', back: 'ظهر', shoulders: 'أكتاف', arms: 'ذراع', abs: 'بطن', cardio: 'كارديو',
    equipment: 'الأدوات', allEquipment: 'كل الأدوات', barbell: 'بار', dumbbell: 'دمبل', machine: 'جهاز', cable: 'كابل', bodyweight: 'وزن الجسم',
    mine: 'تماريني', own: 'خاص بي', loading: 'جارٍ تحميل التمارين', error: 'تعذّر تحميل التمارين. حاول مجددًا.', retry: 'حاول مجددًا',
    empty: 'لا يوجد تمرين بهذا الاسم', emptyMine: 'لم تنشئ تمرينًا خاصًا بعد. أنشئ واحدًا من زر تمرين جديد.',
    target: 'العضلة الأساسية', secondary: 'العضلات المساعدة', instructions: 'طريقة الأداء',
    missing: 'غير مسجل', noMedia: 'لا توجد صورة للتمرين', video: 'شاهد فيديو التمرين', edit: 'تعديل', close: 'إغلاق',
    next: 'التالي', previous: 'السابق', count: '{count} تمرين',
  } as const : undefined; },
  en: {
    title: 'Exercise library', new: 'New exercise', search: 'Search in Arabic or English',
    all: 'All', legs: 'Legs', chest: 'Chest', back: 'Back', shoulders: 'Shoulders', arms: 'Arms', abs: 'Abs', cardio: 'Cardio',
    equipment: 'Equipment', allEquipment: 'All equipment', barbell: 'Barbell', dumbbell: 'Dumbbell', machine: 'Machine', cable: 'Cable', bodyweight: 'Bodyweight',
    mine: 'My exercises', own: 'Mine', loading: 'Loading exercises', error: 'Could not load exercises. Try again.', retry: 'Try again',
    empty: 'No exercise with this name', emptyMine: 'No custom exercises yet. Create one with New exercise.',
    target: 'Target muscle', secondary: 'Secondary muscles', instructions: 'Instructions',
    missing: 'Not recorded', noMedia: 'No exercise image', video: 'Watch exercise video', edit: 'Edit', close: 'Close',
    next: 'Next', previous: 'Previous', count: '{count} exercises',
  },
});

import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    minutes: '{count} دقيقة', low: 'خفيف', moderate: 'متوسط', high: 'عالي',
    week: 'الأسبوع {current} من {total}', change: 'غيّر البرنامج', edit: 'عدّل', assign: 'ادّيله برنامج',
    empty: 'مفيش برنامج لسه', emptyBody: 'اختار برنامج جاهز أو ابدأ برنامج جديد للاعب',
    day: 'يوم {number} · {title}', dayNumber: 'يوم {number}', days: 'أيام البرنامج', noDays: 'مفيش أيام في البرنامج لسه',
    noExercises: 'مفيش تمارين في اليوم ده', restDay: 'يوم راحة', rest: 'راحة {seconds} ثانية',
    failure: 'للفشل', unavailableExercise: 'التمرين مش متاح', close: 'اقفل',
    loading: 'بنحمّل البرنامج…', error: 'مش قادرين نحمّل البرنامج. جرّب تاني', retry: 'جرّب تاني',
  },
  arStd: {
    minutes: '{count} دقيقة', low: 'خفيف', moderate: 'متوسط', high: 'عالٍ',
    week: 'الأسبوع {current} من {total}', change: 'غيّر البرنامج', edit: 'عدّل', assign: 'عيّن له برنامجاً',
    empty: 'لا يوجد برنامج بعد', emptyBody: 'اختر برنامجاً جاهزاً أو أنشئ برنامجاً جديداً للاعب',
    day: 'يوم {number} · {title}', dayNumber: 'يوم {number}', days: 'أيام البرنامج', noDays: 'لا توجد أيام في البرنامج بعد',
    noExercises: 'لا توجد تمارين في هذا اليوم', restDay: 'يوم راحة', rest: 'راحة {seconds} ثانية',
    failure: 'حتى الفشل', unavailableExercise: 'التمرين غير متاح', close: 'إغلاق',
    loading: 'جارٍ تحميل البرنامج…', error: 'تعذّر تحميل البرنامج. حاول مجدداً', retry: 'حاول مجدداً',
  },
  en: {
    minutes: '{count} minutes', low: 'Low', moderate: 'Moderate', high: 'High',
    week: 'Week {current} of {total}', change: 'Change program', edit: 'Edit', assign: 'Assign a program',
    empty: 'No program yet', emptyBody: 'Choose a template or build a new program for this player',
    day: 'Day {number} · {title}', dayNumber: 'Day {number}', days: 'Program days', noDays: 'No program days yet',
    noExercises: 'No exercises for this day', restDay: 'Rest day', rest: 'Rest {seconds} seconds',
    failure: 'To failure', unavailableExercise: 'Exercise unavailable', close: 'Close',
    loading: 'Loading program…', error: 'Could not load the program. Try again', retry: 'Retry',
  },
});

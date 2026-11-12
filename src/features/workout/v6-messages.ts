import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './v6-messages-standard';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { kg: 'كجم', reps: 'عدات', number: '#', progress: '{day} · {current} من {total}',
    chest: 'صدر', back: 'ضهر', waist: 'وسط', upperArms: 'ذراع', lowerArms: 'ساعد',
    upperLegs: 'فخذ', lowerLegs: 'سمانة', shoulders: 'كتف', cardio: 'كارديو',
    rest: 'راحة {seconds}ث', prescription: '{sets} × {reps}', controls: 'تعديل الوزن والعدات',
    workout: 'التمرين', exercises: 'الحركات', history: 'السجل', notes: 'ملاحظات الكابتن' },
  en: { kg: 'kg', reps: 'Reps', number: '#', progress: '{day} · {current} of {total}',
    chest: 'Chest', back: 'Back', waist: 'Waist', upperArms: 'Upper arms', lowerArms: 'Forearms',
    upperLegs: 'Thighs', lowerLegs: 'Calves', shoulders: 'Shoulders', cardio: 'Cardio',
    rest: 'Rest {seconds}s', prescription: '{sets} × {reps}', controls: 'Adjust weight and reps',
    workout: 'Workout', exercises: 'Exercises', history: 'History', notes: 'Coach notes' },
});

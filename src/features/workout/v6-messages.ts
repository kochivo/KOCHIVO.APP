import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
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

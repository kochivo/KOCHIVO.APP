import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/messages';
export const messages = defineMessages({ ar: {
  ramadan: 'رمضان', day: 'رمضان · اليوم {n}', iftarClock: 'على المغرب', yourDay: 'يومك',
  suhoor: 'سحور', iftar: 'فطار', workout: 'تمرين · {n} دقيقة', post_workout: 'سناك بعد التمرين', nextSuhoor: 'السحور الجاي',
  water: 'الماية من الفطار', cups: '{n} من 8 كوبايات', remaining: 'فاضل {n} ساعات على السحور', drink: 'شربت كوباية',
  error: 'مقدرناش نحمّل وضع رمضان', retry: 'جرّب تاني', waterError: 'مقدرناش نسجّل الكوباية. جرّب تاني.',
  lighter: 'رمضان: أخف 20%', maintenance: 'رمضان: مجموعة أقل', tip: 'قلّل الملح في السحور عشان العطش.',
}, get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; }, en: {
  ramadan: 'Ramadan', day: 'Ramadan · day {n}', iftarClock: 'Time to iftar', yourDay: 'Your day',
  suhoor: 'Suhoor', iftar: 'Iftar', workout: 'Workout · {n} min', post_workout: 'Post-workout snack', nextSuhoor: 'Next suhoor',
  water: 'Water since iftar', cups: '{n} of 8 cups', remaining: '{n} hours until suhoor', drink: 'I drank a cup',
  error: 'Could not load Ramadan mode', retry: 'Try again', waterError: 'Could not record your cup. Try again.',
  lighter: 'Ramadan: 20% lighter', maintenance: 'Ramadan: one fewer set', tip: 'Use less salt at suhoor to reduce thirst.',
} });

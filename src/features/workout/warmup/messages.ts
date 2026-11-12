import { defineMessages } from '@/core/i18n/messages';

const arStd = {
  title: '{step} · ابدأ بالإحماء', exercises: '{step} · التمارين',
  continue: 'أكمل الإحماء', skip: 'تخطَّ الإحماء',
  min: '{amount} د', sec: '{amount} ث', reps: '{amount}×', times: '{amount}×',
  ramp: 'إحماء: {sets}', percentSet: '{weight}% × {reps}', kgSet: '{weight} كجم × {reps}',
  separator: ' · ', summary: '~{minutes} دقيقة · {count} تمارين',
  today: 'اليوم · {weekday}',
  navigation: 'التنقل', workout: 'تمريني', food: 'غذائي', progress: 'تقدمي', account: 'أنا', blank: '—',
  sun: 'الأحد', mon: 'الإثنين', tue: 'الثلاثاء', wed: 'الأربعاء', thu: 'الخميس', fri: 'الجمعة', sat: 'السبت',
} as const;

export const messages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    title: '{step} · سخّن الأول', exercises: '{step} · التمارين',
    continue: 'كمّل التسخين', skip: 'تخطّي التسخين',
    min: '{amount} د', sec: '{amount} ث', reps: '{amount}×', times: '{amount}×',
    ramp: 'تسخين: {sets}', percentSet: '{weight}% × {reps}', kgSet: '{weight} كجم × {reps}',
    separator: ' · ', summary: '~{minutes} دقيقة · {count} تمارين',
    today: 'النهارده · {weekday}',
    navigation: 'التنقل', workout: 'تمريني', food: 'أكلي', progress: 'تقدمي', account: 'أنا', blank: '—',
    sun: 'الأحد', mon: 'الإثنين', tue: 'الثلاثاء', wed: 'الأربعاء', thu: 'الخميس', fri: 'الجمعة', sat: 'السبت',
  },
  en: {
    title: '{step} · Warm up first', exercises: '{step} · Exercises',
    continue: 'Continue warm-up', skip: 'Skip warm-up',
    min: '{amount} min', sec: '{amount} sec', reps: '{amount}×', times: '{amount}×',
    ramp: 'Warm-up: {sets}', percentSet: '{weight}% × {reps}', kgSet: '{weight} kg × {reps}',
    separator: ' · ', summary: '~{minutes} minutes · {count} exercises',
    today: 'Today · {weekday}',
    navigation: 'Navigation', workout: 'My workout', food: 'My food', progress: 'My progress', account: 'Me', blank: '—',
    sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday',
  },
});

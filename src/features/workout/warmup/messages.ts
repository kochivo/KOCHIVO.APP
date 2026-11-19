import { defineMessages } from '@/core/i18n/messages';

const arStd = {
  title: '{step} · ابدأ بالإحماء', exercises: '{step} · التمارين',
  continue: 'أكمل الإحماء', skip: 'تخطَّ الإحماء',
  min: '{amount} د', sec: '{amount} ث', reps: '{amount}×', times: '{amount}×',
  ramp: 'إحماء: {sets}', percentSet: '{weight}% × {reps}', kgSet: '{weight} كجم × {reps}',
  separator: ' · ', summary: "~{minutes} · {count}", 'summaryMinutes.one': "دقيقة واحدة", 'summaryMinutes.two': "دقيقتان", 'summaryMinutes.few': "{minutes} دقائق", 'summaryMinutes.many': "{minutes} دقيقة", 'summaryMinutes.other': "{minutes} دقيقة", 'summaryCount.one': "تمرين واحد", 'summaryCount.two': "تمرينان", 'summaryCount.few': "{count} تمارين", 'summaryCount.many': "{count} تمرينًا", 'summaryCount.other': "{count} تمرين",
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
    separator: ' · ', summary: "~{minutes} · {count}", 'summaryMinutes.one': "دقيقة واحدة", 'summaryMinutes.two': "دقيقتين", 'summaryMinutes.few': "{minutes} دقايق", 'summaryMinutes.many': "{minutes} دقيقة", 'summaryMinutes.other': "{minutes} دقيقة", 'summaryCount.one': "تمرين واحد", 'summaryCount.two': "تمرينين", 'summaryCount.few': "{count} تمارين", 'summaryCount.many': "{count} تمرين", 'summaryCount.other': "{count} تمرين",
    today: 'النهارده · {weekday}',
    navigation: 'التنقل', workout: 'تمريني', food: 'أكلي', progress: 'تقدمي', account: 'أنا', blank: '—',
    sun: 'الأحد', mon: 'الإثنين', tue: 'الثلاثاء', wed: 'الأربعاء', thu: 'الخميس', fri: 'الجمعة', sat: 'السبت',
  },
  en: {
    title: '{step} · Warm up first', exercises: '{step} · Exercises',
    continue: 'Continue warm-up', skip: 'Skip warm-up',
    min: '{amount} min', sec: '{amount} sec', reps: '{amount}×', times: '{amount}×',
    ramp: 'Warm-up: {sets}', percentSet: '{weight}% × {reps}', kgSet: '{weight} kg × {reps}',
    separator: ' · ', summary: "~{minutes} · {count}", 'summaryMinutes.one': "{minutes} minute", 'summaryMinutes.other': "{minutes} minutes", 'summaryCount.one': "{count} exercise", 'summaryCount.other': "{count} exercises",
    today: 'Today · {weekday}',
    navigation: 'Navigation', workout: 'My workout', food: 'My food', progress: 'My progress', account: 'Me', blank: '—',
    sun: 'Sunday', mon: 'Monday', tue: 'Tuesday', wed: 'Wednesday', thu: 'Thursday', fri: 'Friday', sat: 'Saturday',
  },
});

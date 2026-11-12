import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: { title: 'سؤالين الصبح', intro: 'علشان الكابتن يعرف تتمرن النهارده إزاي',
    score: 'جاهزيتك النهارده {n}', suggested: 'المقترح: {decision}', done: 'تم',
    keep: 'كمّل زي الخطة', reduce: 'خفّف التمرين', rest: 'راحة النهارده' },
  en: { title: 'Two morning questions', intro: 'Help your coach plan today’s workout',
    score: 'Your readiness today: {n}', suggested: 'Suggested: {decision}', done: 'Done',
    keep: 'Follow the plan', reduce: 'Reduce the workout', rest: 'Rest today' },
});

import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/history-v3-messages';

export const messages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: { title: 'تمارينك', back: 'رجوع', week: '{done} من {planned} الأسبوع ده',
    sat: 'سبت', sun: 'حد', mon: 'اتنين', tue: 'تلات', wed: 'أربع', thu: 'خميس', fri: 'جمعة',
    trained: 'اتمرنت', missed: 'فاتك', today: 'النهارده', previous: 'الشهر اللي فات', next: 'الشهر الجاي',
    sessions: 'آخر تمارين', summary: '{min} د · {sets} مجموعة', pr: 'رقم قياسي',
    jan: 'ينا', feb: 'فبر', mar: 'مار', apr: 'أبر', may: 'ماي', jun: 'يون', jul: 'يول', aug: 'أغس', sep: 'سبت', oct: 'أكت', nov: 'نوف', dec: 'ديس' },
  en: { title: 'Your workouts', back: 'Back', week: '{done} of {planned} this week',
    sat: 'Sat', sun: 'Sun', mon: 'Mon', tue: 'Tue', wed: 'Wed', thu: 'Thu', fri: 'Fri',
    trained: 'Trained', missed: 'Missed', today: 'Today', previous: 'Previous month', next: 'Next month',
    sessions: 'Recent workouts', summary: '{min} min · {sets} sets', pr: 'Personal record',
    jan: 'Jan', feb: 'Feb', mar: 'Mar', apr: 'Apr', may: 'May', jun: 'Jun', jul: 'Jul', aug: 'Aug', sep: 'Sep', oct: 'Oct', nov: 'Nov', dec: 'Dec' },
});

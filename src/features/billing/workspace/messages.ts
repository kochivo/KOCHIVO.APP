import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard-messages';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    usageTail: 'من {limit} لاعب', currency: 'جنيه',
    previous: 'اللي قبلها', next: 'اللي بعدها',
    plan: 'اشتراكي', usage: '{used} من {limit} لاعب', upgrade: 'رقّي باقتك', paid: 'اتدفع الشهر ده',
    dues: 'متأخر', endingWeek: 'هيخلص الأسبوع ده', playerUnit: 'لاعب', money: '{amount} جنيه',
    player: 'اللاعب', status: 'الحالة', until: 'لحد', last: 'آخر دفع', active: 'نشط',
    ending: 'هيخلص بعد {n} أيام', overdue: 'متأخر {n} أيام', frozen: 'متجمد', pending: 'مستني التفعيل',
    renew: 'جدّد', remind: 'فكّره', record: 'سجّل دفع', unfreeze: 'فكّ التجميد', activate: 'فعّل',
    history: 'سجل الدفعات', details: 'تفاصيل الدفعات والباقات', close: 'اقفل', retry: 'جرّب تاني',
    empty: 'لسه مفيش دفعات', failure: 'مش قادرين نحمّل الدفعات. جرّب تاني', notes: 'ملاحظات الدفع',
    collection: 'دفعة', renewal: 'تجديد', more: 'تفاصيل الباقة', noPhone: 'ضيف رقم واتساب من ملف اللاعب عشان تفكّره',
  },
  en: {
    usageTail: 'of {limit} players', currency: 'EGP',
    previous: 'Previous', next: 'Next',
    plan: 'My subscription', usage: '{used} of {limit} players', upgrade: 'Upgrade plan', paid: 'Paid this month',
    dues: 'Overdue', endingWeek: 'Ending this week', playerUnit: 'players', money: 'EGP {amount}',
    player: 'Player', status: 'Status', until: 'Until', last: 'Last payment', active: 'Active',
    ending: 'Ends in {n} days', overdue: '{n} days overdue', frozen: 'Frozen', pending: 'Awaiting activation',
    renew: 'Renew', remind: 'Remind', record: 'Record payment', unfreeze: 'Unfreeze', activate: 'Activate',
    history: 'Payment history', details: 'Finance and packages', close: 'Close', retry: 'Try again',
    empty: 'No payments yet', failure: "Couldn't load payments. Try again", notes: 'Payment notes',
    collection: 'Payment', renewal: 'Renewal', more: 'Plan details', noPhone: 'Add a WhatsApp number on the player profile to send a reminder',
  },
});

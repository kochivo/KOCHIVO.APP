import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard-messages';

export const messages = defineMessages({
  // The local env branch lets Next remove these strings from flag-off client builds.
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    intro: 'كل لاعب، دفع كام وفاضل كام', owed: 'مستني يتحصّل', actions: 'الإجراء',
    catalogTitle: 'الباقات', catalogIntro: 'الباقات اللي لاعبينك بيختاروا منها في لينك الدعوة',
    waitingForPlans: 'مستني الأنظمة',
    'usageTail.one': 'من لاعب واحد', 'usageTail.two': 'من لاعبين', 'usageTail.few': 'من {limit} لاعبين', 'usageTail.many': 'من {limit} لاعب', 'usageTail.other': 'من {limit} لاعب', currency: 'جنيه',
    previous: 'اللي قبلها', next: 'اللي بعدها',
    plan: 'اشتراكي', 'usage.one': '{used} من لاعب واحد', 'usage.two': '{used} من لاعبين', 'usage.few': '{used} من {limit} لاعبين', 'usage.many': '{used} من {limit} لاعب', 'usage.other': '{used} من {limit} لاعب', upgrade: 'رقّي باقتك', paid: 'اتدفع الشهر ده',
    dues: 'متأخر', endingWeek: 'هيخلص الأسبوع ده', playerUnit: 'لاعب', money: '{amount} جنيه',
    player: 'اللاعب', status: 'الحالة', until: 'لحد', last: 'آخر دفع', active: 'نشط',
    'ending.one': "هيخلص بكرة", 'ending.two': "هيخلص بعد يومين", 'ending.few': "هيخلص بعد {n} أيام", 'ending.many': "هيخلص بعد {n} يوم", 'ending.other': "هيخلص بعد {n} يوم", 'overdue.one': "متأخر من امبارح", 'overdue.two': "متأخر يومين", 'overdue.few': "متأخر {n} أيام", 'overdue.many': "متأخر {n} يوم", 'overdue.other': "متأخر {n} يوم", frozen: 'متجمد', pending: 'مستني التفعيل',
    renew: 'جدّد', remind: 'فكّره', record: 'سجّل دفع', unfreeze: 'فكّ التجميد', activate: 'فعّل',
    history: 'سجل الدفعات', details: 'تفاصيل الدفعات والباقات', close: 'اقفل', retry: 'جرّب تاني',
    empty: 'لسه مفيش دفعات', failure: 'مش قادرين نحمّل الدفعات. جرّب تاني', notes: 'ملاحظات الدفع',
    collection: 'دفعة', renewal: 'تجديد', more: 'تفاصيل الباقة', noPhone: 'ضيف رقم واتساب من ملف اللاعب عشان تفكّره',
  },
  en: {
    intro: 'Track each player’s payments and balance', owed: 'To collect', actions: 'Action',
    catalogTitle: 'Packages', catalogIntro: 'Packages players can choose from your invite link',
    waitingForPlans: 'Waiting for plans',
    'usageTail.one': 'of {limit} player', 'usageTail.other': 'of {limit} players', currency: 'EGP',
    previous: 'Previous', next: 'Next',
    plan: 'My subscription', 'usage.one': '{used} of {limit} player', 'usage.other': '{used} of {limit} players', upgrade: 'Upgrade plan', paid: 'Paid this month',
    dues: 'Overdue', endingWeek: 'Ending this week', playerUnit: 'players', money: 'EGP {amount}',
    player: 'Player', status: 'Status', until: 'Until', last: 'Last payment', active: 'Active',
    'ending.one': "Ends tomorrow", 'ending.other': "Ends in {n} days", 'overdue.one': "Overdue since yesterday", 'overdue.other': "{n} days overdue", frozen: 'Frozen', pending: 'Awaiting activation',
    renew: 'Renew', remind: 'Remind', record: 'Record payment', unfreeze: 'Unfreeze', activate: 'Activate',
    history: 'Payment history', details: 'Finance and packages', close: 'Close', retry: 'Try again',
    empty: 'No payments yet', failure: "Couldn't load payments. Try again", notes: 'Payment notes',
    collection: 'Payment', renewal: 'Renewal', more: 'Plan details', noPhone: 'Add a WhatsApp number on the player profile to send a reminder',
  },
});

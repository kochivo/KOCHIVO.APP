import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard/pages-messages';

export const messages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    reviewed: 'اتراجع',
    profileTitle: 'الكابتن واشتراكك', back: 'ارجع', subscription: 'اشتراكك', active: 'شغّال',
    memberSince: 'عضو من {date}', until: 'لحد {date}', daysLeftToday: 'بيخلص النهارده', 'daysLeft.one': "بيخلص بكرة", 'daysLeft.two': "فاضل يومين", 'daysLeft.few': "فاضل {n} أيام", 'daysLeft.many': "فاضل {n} يوم", 'daysLeft.other': "فاضل {n} يوم",
    renew: 'جدد باقتك', renewalBody: 'اختار الباقة وابعت للكابتن طلب التجديد. نفس باقات الكابتن الموجودة دلوقتي.',
    whatsapp: 'كلّم الكابتن على واتساب', assessments: 'تقييماتي', due: 'مطلوب منك',
    past: 'اللي سجلته قبل كده', record: 'سجّل التقييم', recordShort: 'سجّل',
    dueBy: 'مطلوب لحد {date}', noPast: 'لسه مسجلتش تقييمات',
    'dueCount.one': "تقييم واحد مطلوبة",
    'dueCount.two': "تقييمين مطلوبة",
    'dueCount.few': "{n} تقييمات مطلوبة",
    'dueCount.many': "{n} تقييم مطلوبة",
    'dueCount.other': "{n} تقييم مطلوبة",
  },
  en: {
    reviewed: 'Reviewed',
    profileTitle: 'Coach and subscription', back: 'Back', subscription: 'Your subscription', active: 'Active',
    memberSince: 'Member since {date}', until: 'Until {date}', daysLeftToday: 'Ends today', 'daysLeft.one': "Ends tomorrow", 'daysLeft.other': "{n} days left",
    renew: 'Renew your plan', renewalBody: 'Choose a plan and send your coach a renewal request from their current plans.',
    whatsapp: 'Message your coach on WhatsApp', assessments: 'My assessments', due: 'Due from you',
    past: 'Past assessments', record: 'Record assessment', recordShort: 'Record',
    dueBy: 'Due by {date}', noPast: 'No assessments recorded yet', 'dueCount.one': "{n} assessment due",
    'dueCount.other': "{n} assessments due",
  },
});

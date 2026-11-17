import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard-messages';

export const messages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    limit: 'أقصى أيام تجميد', limitHint: 'سيبها فاضية أو اكتب 0 عشان توقف طلبات التجميد',
    request: 'اطلب تجميد', title: 'طلب تجميد الاشتراك', days: 'أيام التجميد', note: 'سبب التجميد (اختياري)',
    remaining: 'فاضلك {count} يوم تجميد في الفترة دي', send: 'ابعت الطلب', close: 'اقفل',
    pending: 'طلبك مستني رد الكابتن', cancel: 'إلغاء الطلب', until: 'متجمّد لحد {date}',
    requests: 'طلبات التجميد', empty: 'لسه مفيش طلبات تجميد', duration: '{count} يوم',
    approve: 'موافقة', decline: 'رفض', saved: 'القرار اتحفظ', sent: 'طلب التجميد اتبعت', cancelled: 'الطلب اتلغى',
    loading: 'بنحمّل طلبات التجميد…', error: 'طلب التجميد متعملش. جرّب تاني', retry: 'جرّب تاني',
  },
  en: {
    limit: 'Maximum freeze days', limitHint: 'Leave blank or enter 0 to disable freeze requests',
    request: 'Request a freeze', title: 'Freeze your subscription', days: 'Freeze days', note: 'Reason (optional)',
    remaining: '{count} freeze days left in this period', send: 'Send request', close: 'Close',
    pending: 'Your request is waiting for your captain', cancel: 'Cancel request', until: 'Frozen until {date}',
    requests: 'Freeze requests', empty: 'No freeze requests', duration: '{count} days',
    approve: 'Approve', decline: 'Decline', saved: 'Decision saved', sent: 'Freeze request sent', cancelled: 'Request cancelled',
    loading: 'Loading freeze requests…', error: 'Freeze request failed. Try again', retry: 'Try again',
  },
});

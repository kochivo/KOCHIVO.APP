import { defineMessages } from '@/core/i18n/messages';

export const messages = defineMessages({
  ar: {
    title: 'طلبات الكباتن', count: '{n} طلب تحت المراجعة', empty: 'مفيش طلبات كباتن دلوقتي',
    approve: 'وافق', reject: 'ارفض', approveName: 'وافق على طلب {name}', rejectName: 'ارفض طلب {name}',
    confirm: 'تأكيد رفض طلب {name}؟ الحساب هيفضل موجود.', cancel: 'إلغاء',
    failed: 'العملية ما كملتش، جرّب تاني', loadFailed: 'مقدرناش نحمّل طلبات الكباتن',
    retry: 'جرّب تاني', loading: 'بنحمّل طلبات الكباتن…', noEmail: 'مفيش إيميل',
  },
  en: {
    title: 'Captain requests', count: '{n} pending requests', empty: 'No captain requests',
    approve: 'Approve', reject: 'Reject', approveName: 'Approve {name}', rejectName: 'Reject {name}',
    confirm: 'Reject {name}? Their account will be kept.', cancel: 'Cancel',
    failed: 'Could not save. Try again', loadFailed: 'Could not load captain requests',
    retry: 'Try again', loading: 'Loading captain requests…', noEmail: 'No email',
  },
});

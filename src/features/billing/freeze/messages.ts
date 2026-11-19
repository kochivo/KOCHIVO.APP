import { defineMessages } from '@/core/i18n/messages';
import { arStd } from './standard-messages';

export const messages = defineMessages({
  get arStd() { return process.env.NEXT_PUBLIC_INTERNATIONAL === '1' ? arStd : undefined; },
  ar: {
    defaultDays: 'أيام التجميد لأي اشتراك من غير باقة',
    defaultHint: 'بتتطبق على اللعيبة اللي اشتراكهم متسجل بالإيد. سيبها فاضية عشان تقفل التجميد ليهم',
    settingsLoading: 'بنحمّل إعدادات التجميد…', settingsLoadError: 'إعدادات التجميد متحمّلتش. جرّب تاني',
    settingsSaving: 'بنحفظ إعدادات التجميد…', settingsSaved: 'إعدادات التجميد اتحفظت',
    settingsSaveError: 'إعدادات التجميد متحفظتش. جرّب تاني',
    limit: 'أقصى أيام تجميد', limitHint: 'سيبها فاضية أو اكتب 0 عشان توقف طلبات التجميد',
    request: 'اطلب تجميد', title: 'طلب تجميد الاشتراك', days: 'أيام التجميد', note: 'سبب التجميد (اختياري)',
    'remaining.one': "فاضلك يوم تجميد واحد في الفترة دي", 'remaining.two': "فاضلك يومين تجميد في الفترة دي", 'remaining.few': "فاضلك {count} أيام تجميد في الفترة دي", 'remaining.many': "فاضلك {count} يوم تجميد في الفترة دي", 'remaining.other': "فاضلك {count} يوم تجميد في الفترة دي", send: 'ابعت الطلب', close: 'اقفل',
    pending: 'طلبك مستني رد الكابتن', cancel: 'إلغاء الطلب', until: 'متجمّد لحد {date}',
    requests: 'طلبات التجميد', empty: 'لسه مفيش طلبات تجميد', 'duration.one': "يوم واحد",
    'duration.two': "يومين",
    'duration.few': "{count} أيام",
    'duration.many': "{count} يوم",
    'duration.other': "{count} يوم",
    approve: 'موافقة', decline: 'رفض', saved: 'القرار اتحفظ', sent: 'طلب التجميد اتبعت', cancelled: 'الطلب اتلغى',
    loading: 'بنحمّل طلبات التجميد…', error: 'طلب التجميد متعملش. جرّب تاني', retry: 'جرّب تاني',
  },
  en: {
    defaultDays: 'Freeze days for subscriptions without a package',
    defaultHint: 'Applies to manually recorded subscriptions. Leave blank to disable their freezes',
    settingsLoading: 'Loading freeze settings…', settingsLoadError: 'Could not load freeze settings. Try again',
    settingsSaving: 'Saving freeze settings…', settingsSaved: 'Freeze settings saved',
    settingsSaveError: 'Could not save freeze settings. Try again',
    limit: 'Maximum freeze days', limitHint: 'Leave blank or enter 0 to disable freeze requests',
    request: 'Request a freeze', title: 'Freeze your subscription', days: 'Freeze days', note: 'Reason (optional)',
    'remaining.one': "{count} freeze day left in this period", 'remaining.other': "{count} freeze days left in this period", send: 'Send request', close: 'Close',
    pending: 'Your request is waiting for your captain', cancel: 'Cancel request', until: 'Frozen until {date}',
    requests: 'Freeze requests', empty: 'No freeze requests', 'duration.one': "{count} day",
    'duration.other': "{count} days",
    approve: 'Approve', decline: 'Decline', saved: 'Decision saved', sent: 'Freeze request sent', cancelled: 'Request cancelled',
    loading: 'Loading freeze requests…', error: 'Freeze request failed. Try again', retry: 'Try again',
  },
});
